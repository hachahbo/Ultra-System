import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { orderSchema } from "@/lib/schemas";
import type { CustomizationGroup, OrderLine } from "@/lib/types";

// Public order intake (dine-in QR + delivery). Uses the service role — every
// row is scoped to the restaurant resolved server-side from the slug, and all
// prices are recomputed from the DB so the client can't tamper with them.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const supabase = createAdminClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, currency, base_delivery_fee, is_dine_in_enabled, is_delivery_enabled")
    .eq("slug", input.restaurant_slug)
    .maybeSingle();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }
  if (input.type === "dine_in" && !restaurant.is_dine_in_enabled) {
    return NextResponse.json({ error: "Commande sur place indisponible" }, { status: 400 });
  }
  if (input.type === "delivery" && !restaurant.is_delivery_enabled) {
    return NextResponse.json({ error: "Livraison indisponible" }, { status: 400 });
  }

  // Recompute every line from the DB.
  const itemIds = [...new Set(input.lines.map((l) => l.item_id))];
  const { data: items } = await supabase
    .from("items")
    .select("id, name_fr, base_price, in_stock, customization_groups")
    .eq("restaurant_id", restaurant.id)
    .in("id", itemIds);

  const itemsById = new Map((items ?? []).map((i) => [i.id, i]));
  const orderLines: OrderLine[] = [];

  for (const line of input.lines) {
    const item = itemsById.get(line.item_id);
    if (!item) {
      return NextResponse.json({ error: "Article introuvable" }, { status: 400 });
    }
    if (!item.in_stock) {
      return NextResponse.json(
        { error: `"${item.name_fr}" est épuisé` },
        { status: 409 },
      );
    }
    let unitPrice = Number(item.base_price);
    const validOptions: string[] = [];
    const groups = (item.customization_groups ?? []) as CustomizationGroup[];
    for (const optName of line.options) {
      const opt = groups
        .flatMap((g) => g.options)
        .find((o) => o.name === optName);
      if (!opt) {
        return NextResponse.json({ error: "Option invalide" }, { status: 400 });
      }
      unitPrice += Number(opt.price_modifier);
      validOptions.push(optName);
    }
    orderLines.push({
      item_id: item.id,
      name: item.name_fr,
      quantity: line.quantity,
      unit_price: unitPrice,
      options: validOptions,
    });
  }

  const subtotal = orderLines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const deliveryFee =
    input.type === "delivery" ? Number(restaurant.base_delivery_fee) : 0;
  const total = subtotal + deliveryFee;

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
      return NextResponse.json({ error: "Erreur d'enregistrement" }, { status: 500 });
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
      address: input.type === "delivery" ? input.address : null,
      note: input.note ?? null,
      items: orderLines,
      subtotal,
      delivery_fee: deliveryFee,
      total,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Erreur d'enregistrement" }, { status: 500 });
  }

  return NextResponse.json({ id: order.id, total }, { status: 201 });
}
