import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireOwner } from "@/lib/dashboard";
import { inventoryCategorySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "inventory");
  if (featureError) return featureError;

  const parsed = inventoryCategorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("inventory_categories")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", guard.ctx.restaurant.id);

  const { data: category, error } = await supabase
    .from("inventory_categories")
    .insert({
      restaurant_id: guard.ctx.restaurant.id,
      name: parsed.data.name,
      sort_order: (count ?? 0) + 1,
    })
    .select("*")
    .single();

  if (error || !category) {
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
  return NextResponse.json({ category }, { status: 201 });
}
