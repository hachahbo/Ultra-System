import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/dashboard";

// Menu management feed: categories + items for the user's restaurant,
// plus tenant context the client needs (restaurant_id for storage paths).
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = await createClient();
  const restaurantId = ctx.restaurant.id;

  // Costs only queried when the plan includes recipe costing — the view
  // still resolves to base_price/0-cost rows for items with no recipe, but
  // there's no reason to pay the extra query for plans that can't see it.
  const [{ data: categories }, { data: items }, costsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase
      .from("items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    ctx.features.recipes
      ? supabase
          .from("menu_item_costs")
          .select("menu_item_id, computed_cost, margin_mad, margin_pct")
          .eq("restaurant_id", restaurantId)
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    restaurant_id: restaurantId,
    role: ctx.profile.role,
    features: ctx.features,
    categories: categories ?? [],
    items: items ?? [],
    costs: costsResult.data ?? [],
  });
}
