import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/dashboard";
import { promoCodeObjectSchema } from "@/lib/schemas";

const patchSchema = promoCodeObjectSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Aucune modification")
  .refine(
    (v) => v.discount_type !== "percentage" || v.discount_value === undefined || v.discount_value <= 100,
    { message: "Un pourcentage ne peut pas dépasser 100", path: ["discount_value"] },
  );

// PATCH /api/dashboard/promo-codes/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;

  const { id } = await params;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { ...parsed.data };
  if ("max_uses" in patch) patch.max_uses = parsed.data.max_uses ?? null;
  if ("expires_at" in patch) patch.expires_at = parsed.data.expires_at || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", guard.ctx.restaurant.id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce code existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({ promo_code: data });
}

// DELETE /api/dashboard/promo-codes/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;

  const { id } = await params;

  const supabase = await createClient();
  const { error } = await supabase
    .from("promo_codes")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", guard.ctx.restaurant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
