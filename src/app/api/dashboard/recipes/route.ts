import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";
import { z } from "zod";

const recipeSchema = z.object({
  menu_item_id: z.string().uuid(),
  inventory_item_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1).max(30),
  notes: z.string().trim().max(300).optional(),
});

// GET /api/dashboard/recipes?menu_item_id=<uuid>
export async function GET(request: Request) {
  const guard = await requireRole(["owner", "manager", "serveur", "cuisine"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "recipes");
  if (featureError) return featureError;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const menuItemId = searchParams.get("menu_item_id");

  let query = supabase
    .from("recipes")
    .select(`
      id, menu_item_id, quantity, unit, notes,
      inventory_item:inventory_items(id, name, unit, stock, unit_price_mad)
    `)
    .order("created_at");

  if (menuItemId) query = query.eq("menu_item_id", menuItemId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  return NextResponse.json({ recipes: data });
}

// POST /api/dashboard/recipes
export async function POST(request: Request) {
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "recipes");
  if (featureError) return featureError;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .insert({ ...parsed.data, restaurant_id: guard.ctx.restaurant.id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Cette recette existe déjà pour cet article" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recipe: data }, { status: 201 });
}
