import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { orderSchema } from "@/lib/schemas";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveLineOptions } from "@/lib/order-options";
import { evaluatePromoCode } from "@/lib/promo";
import { formatPrice } from "@/lib/format";
import type { CustomizationGroup, OrderLine, PromoCode } from "@/lib/types";

// Public order intake (dine-in QR + delivery). Uses the service role — every
// row is scoped to the restaurant resolved server-side from the slug, and all
// prices are recomputed from the DB so the client can't tamper with them.
export async function POST(request: Request) {
  // Errors go straight into a toast on the public site, so they follow the
  // visitor's locale cookie like the rest of the page.
  const t = await getTranslations("Errors");
  const ip = clientIp(request);
  const ipLimit = await checkRateLimit(`order:ip:${ip}`, 10, 60);
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds, t("rateLimited"));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("invalidBody") }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t("invalidData"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const supabase = createAdminClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, plan, status, currency, base_delivery_fee, is_dine_in_enabled, is_delivery_enabled")
    .eq("slug", input.restaurant_slug)
    .maybeSingle();
  if (!restaurant) {
    return NextResponse.json({ error: t("restaurantNotFound") }, { status: 404 });
  }

  // Soft per-tenant cap — catches a flood spread across many IPs targeting
  // one restaurant's kitchen, which the per-IP limit above wouldn't stop.
  const slugLimit = await checkRateLimit(`order:slug:${restaurant.id}`, 100, 3600);
  if (!slugLimit.allowed) {
    return rateLimitResponse(slugLimit.retryAfterSeconds);
  }

  const features = applyStatusGate(
    restaurant.status,
    await getPublicFeatures(restaurant.id, restaurant.plan),
  );
  if (!features.online_ordering) {
    return NextResponse.json({ error: t("onlineOrderingUnavailable") }, { status: 403 });
  }
  if (input.type === "dine_in" && !restaurant.is_dine_in_enabled) {
    return NextResponse.json({ error: t("dineInUnavailable") }, { status: 400 });
  }
  if (input.type === "delivery" && !restaurant.is_delivery_enabled) {
    return NextResponse.json({ error: t("deliveryUnavailable") }, { status: 400 });
  }

  // The ?table= param is customer-editable, so the number is only trusted
  // once it matches a real table on this restaurant's floor plan. Without
  // this, `?table=999` reaches the kitchen as a ticket nobody can deliver —
  // and the session trigger (0015) silently skips it, so it wouldn't even
  // show up in turnover analytics.
  if (input.type === "dine_in") {
    const { data: diningTable } = await supabase
      .from("tables")
      .select("id")
      .eq("restaurant_id", restaurant.id)
      .eq("number", input.table_number!)
      .maybeSingle();
    if (!diningTable) {
      return NextResponse.json({ error: t("tableNotFound") }, { status: 400 });
    }
  }

  // Recompute every line from the DB.
  const itemIds = [...new Set(input.lines.map((l) => l.item_id))];
  const { data: items } = await supabase
    .from("items")
    .select("id, name_fr, base_price, in_stock, customization_groups, image_url")
    .eq("restaurant_id", restaurant.id)
    .in("id", itemIds);

  const itemsById = new Map((items ?? []).map((i) => [i.id, i]));
  const orderLines: OrderLine[] = [];

  for (const line of input.lines) {
    const item = itemsById.get(line.item_id);
    if (!item) {
      return NextResponse.json({ error: t("itemNotFound") }, { status: 400 });
    }
    if (!item.in_stock) {
      return NextResponse.json(
        { error: t("itemSoldOut", { name: item.name_fr }) },
        { status: 409 },
      );
    }
    const groups = (item.customization_groups ?? []) as CustomizationGroup[];
    const resolved = resolveLineOptions(groups, line.options);
    if (!resolved.ok) {
      return NextResponse.json({ error: t("invalidOption") }, { status: 400 });
    }
    const unitPrice = Number(item.base_price) + resolved.priceModifier;
    const validOptions = resolved.options;
    orderLines.push({
      item_id: item.id,
      name: item.name_fr,
      quantity: line.quantity,
      unit_price: unitPrice,
      options: validOptions,
      image_url: item.image_url ?? null,
    });
  }

  const subtotal = orderLines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const deliveryFee =
    input.type === "delivery" ? Number(restaurant.base_delivery_fee) : 0;

  // Guard against a silent zero-revenue order (Overview/Analytics both sum
  // `orders.total` directly — a bug here would hide real revenue for weeks).
  // Checked on the raw sum, not the post-discount total: a 100%-off promo
  // code legitimately brings `total` to 0, and that's not a bug.
  if (subtotal + deliveryFee <= 0) {
    return NextResponse.json({ error: t("invalidOrder") }, { status: 400 });
  }

  // Re-resolve the promo code from the DB — never trust a discount amount
  // computed client-side, and never trust the /validate response either:
  // the code's state (expiry, uses left) can have changed since "Apply".
  let promo: PromoCode | null = null;
  let discountAmount = 0;
  if (input.promo_code) {
    const { data: promoRow } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("code", input.promo_code.trim().toUpperCase())
      .maybeSingle();

    if (!promoRow || !promoRow.active) {
      return NextResponse.json({ error: t("promoCodeInvalid") }, { status: 400 });
    }
    const result = evaluatePromoCode(promoRow, subtotal);
    if (!result.ok) {
      const messages: Record<typeof result.reason, string> = {
        expired: t("promoCodeExpired"),
        limit_reached: t("promoCodeLimitReached"),
        min_order: t("promoCodeMinOrder", {
          amount: formatPrice(promoRow.min_order_amount, restaurant.currency),
        }),
      };
      return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
    }
    promo = promoRow as PromoCode;
    discountAmount = result.discountAmount;
  }

  const total = subtotal + deliveryFee - discountAmount;

  // The capture: upsert the customer so the phone lands in the DB (§2).
  let customerId: string | null = null;
  if (input.type === "delivery" && input.customer_phone) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          restaurant_id: restaurant.id,
          phone: input.customer_phone,
          name: input.customer_name!,
        },
        { onConflict: "restaurant_id,phone" },
      )
      .select("id, order_count")
      .single();
    if (customerError || !customer) {
      console.error("POST /api/orders customer upsert error:", customerError);
      return NextResponse.json({ error: t("saveFailed") }, { status: 500 });
    }
    customerId = customer.id;
    await supabase
      .from("customers")
      .update({
        order_count: (customer.order_count ?? 0) + 1,
        last_order: new Date().toISOString(),
      })
      .eq("id", customer.id);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      restaurant_id: restaurant.id,
      type: input.type,
      table_number: input.type === "dine_in" ? input.table_number : null,
      customer_id: customerId,
      customer_name: input.customer_name ?? null,
      // Snapshot of what was typed at checkout (0028). On dine-in this is the
      // only place the phone lands — no `customers` row is created, since an
      // anonymous table order shouldn't mint a CRM record.
      customer_phone: input.customer_phone ?? null,
      address: input.type === "delivery" ? input.address : null,
      note: input.note ?? null,
      items: orderLines,
      subtotal,
      delivery_fee: deliveryFee,
      promo_code_id: promo?.id ?? null,
      promo_code: promo?.code ?? null,
      discount_amount: discountAmount,
      total,
      payment_method: input.payment_method,
      payment_status: "unpaid",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    // Public intake has no dashboard behind it — without this the customer
    // just sees a generic toast and the real Postgres error (missing column,
    // failed check constraint, trigger raise) is lost.
    console.error("POST /api/orders db insert error:", orderError);
    return NextResponse.json({ error: t("saveFailed") }, { status: 500 });
  }

  // Best-effort — not atomic (same pattern as the customer order_count bump
  // above). A lost increment under concurrent redemptions just means max_uses
  // is enforced a little loosely, which is an acceptable tradeoff here.
  if (promo) {
    await supabase
      .from("promo_codes")
      .update({ uses_count: promo.uses_count + 1 })
      .eq("id", promo.id);
  }

  return NextResponse.json({ id: order.id, total }, { status: 201 });
}
