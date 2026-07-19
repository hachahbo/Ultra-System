import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";
import { promotionSchema } from "@/lib/schemas";

const patchSchema = promotionSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  "Aucune modification",
);

// PATCH /api/dashboard/promotions/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "promotions");
  if (featureError) return featureError;

  const { id } = await params;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotions")
    .update(parsed.data)
    .eq("id", id)
    .eq("restaurant_id", guard.ctx.restaurant.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({ promotion: data });
}

// DELETE /api/dashboard/promotions/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "promotions");
  if (featureError) return featureError;

  const { id } = await params;

  const supabase = await createClient();
  const { error } = await supabase
    .from("promotions")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", guard.ctx.restaurant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
