import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";
import { inventoryItemSchema } from "@/lib/schemas";

// Inventory management feed: categories + items + suppliers + deliveries for
// the user's restaurant, in one payload (mirrors /api/dashboard/menu).
// Readable by owner/manager/cuisine (access matrix); serveur has no
// inventory access at all.
export async function GET() {
  const guard = await requireRole(["owner", "manager", "cuisine"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "inventory");
  if (featureError) return featureError;

  const restaurantId = guard.ctx.restaurant.id;
  const supabase = await createClient();
  const [
    { data: categories },
    { data: items },
    { data: suppliers },
    { data: deliveries },
  ] = await Promise.all([
    supabase
      .from("inventory_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase
      .from("inventory_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name"),
    supabase
      .from("suppliers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name"),
    supabase
      .from("deliveries")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("eta_at"),
  ]);

  return NextResponse.json({
    role: guard.ctx.profile.role,
    categories: categories ?? [],
    items: items ?? [],
    suppliers: suppliers ?? [],
    deliveries: deliveries ?? [],
  });
}

export async function POST(request: Request) {
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "inventory");
  if (featureError) return featureError;

  const parsed = inventoryItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      restaurant_id: guard.ctx.restaurant.id,
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      unit: parsed.data.unit,
      stock: parsed.data.stock,
      min_threshold: parsed.data.min_threshold,
      unit_price_mad: parsed.data.unit_price_mad ?? 0,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
}
