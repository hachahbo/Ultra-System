import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/dashboard";
import { idSchema } from "@/lib/schemas";
import { resolveLineOptions } from "@/lib/order-options";
import type { CustomizationGroup, OrderLine } from "@/lib/types";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GET — kitchen/orders feed. All 4 roles can read (ROUTE_ACCESS), so
// requireSession() (not requireRole) — it also enforces must_change_password
// and the suspended-tenant block that a bare auth.getUser() check skipped.
// ---------------------------------------------------------------------------
export async function GET() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const supabase = await createClient();
  // Two things matter here beyond the column list:
  //
  // 1. Explicit .eq("restaurant_id") even though RLS already enforces it.
  //    RLS is a *filter*, and PostgREST sends no predicate of its own — the
  //    planner sees only the policy expression and will not always turn it
  //    into an index condition on orders_restaurant_created_idx. A literal
  //    restaurant_id in the WHERE clause makes the index scan unambiguous.
  //    It is not a second security boundary (RLS remains that); it is a hint.
  //
  // 2. select("*") pulled columns the table never reads — subtotal,
  //    delivery_fee, address, note, customer_id, confirmed_by/at, ready_at,
  //    served_by/at, paid_by. `items` is kept: the table renders line
  //    thumbnails, names, quantities and options straight out of it.
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, type, table_number, customer_name, customer_phone, items, total, " +
        "status, payment_status, payment_method, created_at, updated_at",
    )
    .eq("restaurant_id", guard.ctx.restaurant.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
  return NextResponse.json({ orders });
}

// ---------------------------------------------------------------------------
// POST — staff-created orders (POS). Session-authenticated (no rate limit),
// prices recomputed from DB just like the public /api/orders route.
// ---------------------------------------------------------------------------

const staffOrderLineSchema = z.object({
  item_id: idSchema(),
  quantity: z.number().int().min(1).max(50),
  options: z.array(z.string().max(100)).max(10).default([]),
});

const staffOrderSchema = z.object({
  type: z.enum(["dine_in", "takeaway", "delivery"]),
  table_number: z.string().max(10).optional(),
  customer_name: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
  // POS orders are settled at the counter by default — staff can uncheck
  // this for a tab that gets marked paid later via the payment PATCH route.
  paid_now: z.boolean().default(true),
  lines: z.array(staffOrderLineSchema).min(1).max(50),
});

export async function POST(request: Request) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const supabase = await createClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = staffOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const restaurantId = guard.ctx.restaurant.id;

  // Recompute prices from DB — staff can't tamper with them either
  const itemIds = [...new Set(input.lines.map((l) => l.item_id))];
  const { data: items } = await supabase
    .from("items")
    .select("id, name_fr, base_price, in_stock, customization_groups, image_url")
    .eq("restaurant_id", restaurantId)
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
    const groups = (item.customization_groups ?? []) as CustomizationGroup[];
    const resolved = resolveLineOptions(groups, line.options);
    if (!resolved.ok) {
      return NextResponse.json(
        { error: `Option invalide : ${resolved.invalid}` },
        { status: 400 },
      );
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
  if (subtotal <= 0) {
    return NextResponse.json({ error: "Commande invalide" }, { status: 400 });
  }

  // Map POS "takeaway" → DB "delivery" type (no delivery fee for takeaway)
  const dbType = input.type === "dine_in" ? "dine_in" : "delivery";
  const now = new Date().toISOString();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      restaurant_id: restaurantId,
      type: dbType,
      table_number: input.type === "dine_in" ? (input.table_number ?? null) : null,
      customer_name: input.customer_name ?? null,
      note: input.note ?? null,
      items: orderLines,
      subtotal,
      delivery_fee: 0,
      total: subtotal,
      // A waiter typing the order at the table IS the approval — there is no
      // one left to approve it. Starting at the 'pending' default would park
      // the order in its own author's approval queue. The 0030 trigger takes
      // it straight on to 'preparing' and fans it out to the KDS.
      status: "confirmed",
      confirmed_by: guard.ctx.profile.id,
      payment_method: "cash",
      payment_status: input.paid_now ? "paid" : "unpaid",
      paid_at: input.paid_now ? now : null,
      paid_by: input.paid_now ? guard.ctx.profile.id : null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    // Was swallowed entirely, which turned every schema/constraint problem into
    // an opaque 500 with nothing in the log to chase. Mirrors the PATCH handler.
    console.error("POST /api/dashboard/orders insert error:", orderError);
    return NextResponse.json({ error: "Erreur d'enregistrement" }, { status: 500 });
  }

  return NextResponse.json({ id: order.id, total: subtotal }, { status: 201 });
}
