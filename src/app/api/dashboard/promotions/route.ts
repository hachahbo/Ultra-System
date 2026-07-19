import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";
import { promotionSchema } from "@/lib/schemas";

// GET /api/dashboard/promotions — owner-only, matching RLS ("promotions
// owner write" is owner-only even though menu items allow manager writes;
// combos affect pricing platform-wide, not per-item, so this stays stricter
// than /api/dashboard/menu's read gate).
export async function GET() {
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "promotions");
  if (featureError) return featureError;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("restaurant_id", guard.ctx.restaurant.id)
    .order("sort_order");

  if (error) return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  return NextResponse.json({ promotions: data ?? [] });
}

// POST /api/dashboard/promotions
export async function POST(request: Request) {
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "promotions");
  if (featureError) return featureError;

  const parsed = promotionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotions")
    .insert({
      restaurant_id: guard.ctx.restaurant.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      active: parsed.data.active,
      sort_order: parsed.data.sort_order ?? 0,
      rules: parsed.data.rules,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  return NextResponse.json({ promotion: data }, { status: 201 });
}
