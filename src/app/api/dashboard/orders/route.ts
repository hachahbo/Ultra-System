import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CustomizationGroup, OrderLine } from "@/lib/types";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GET — kitchen/orders feed (existing, unchanged)
// ---------------------------------------------------------------------------
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
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
  item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  options: z.array(z.string().max(100)).max(10).default([]),
});

const staffOrderSchema = z.object({
  type: z.enum(["dine_in", "takeaway", "delivery"]),
  table_number: z.string().max(10).optional(),
  customer_name: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
  lines: z.array(staffOrderLineSchema).min(1).max(50),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

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

  // Resolve caller's restaurant via RLS-scoped profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.restaurant_id) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 403 });
  }

  // Recompute prices from DB — staff can't tamper with them either
  const itemIds = [...new Set(input.lines.map((l) => l.item_id))];
  const { data: items } = await supabase
    .from("items")
    .select("id, name_fr, base_price, in_stock, customization_groups")
    .eq("restaurant_id", profile.restaurant_id)
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
  if (subtotal <= 0) {
    return NextResponse.json({ error: "Commande invalide" }, { status: 400 });
  }

  // Map POS "takeaway" → DB "delivery" type (no delivery fee for takeaway)
  const dbType = input.type === "dine_in" ? "dine_in" : "delivery";

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      restaurant_id: profile.restaurant_id,
      type: dbType,
      table_number: input.type === "dine_in" ? (input.table_number ?? null) : null,
      customer_name: input.customer_name ?? null,
      note: input.note ?? null,
      items: orderLines,
      subtotal,
      delivery_fee: 0,
      total: subtotal,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Erreur d'enregistrement" }, { status: 500 });
  }

  return NextResponse.json({ id: order.id, total: subtotal }, { status: 201 });
}
