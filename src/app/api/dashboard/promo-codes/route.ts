import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/dashboard";
import { promoCodeSchema } from "@/lib/schemas";

// GET /api/dashboard/promo-codes — owner-only (pricing-impacting, same
// stricter-than-menu-editor stance as /api/dashboard/promotions).
export async function GET() {
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("restaurant_id", guard.ctx.restaurant.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  return NextResponse.json({ promo_codes: data ?? [] });
}

// POST /api/dashboard/promo-codes
export async function POST(request: Request) {
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;

  const parsed = promoCodeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      restaurant_id: guard.ctx.restaurant.id,
      code: parsed.data.code,
      discount_type: parsed.data.discount_type,
      discount_value: parsed.data.discount_value,
      min_order_amount: parsed.data.min_order_amount,
      max_uses: parsed.data.max_uses ?? null,
      active: parsed.data.active,
      expires_at: parsed.data.expires_at || null,
    })
    .select("*")
    .single();

  if (error) {
    // Unique violation (restaurant_id, code) — the owner already has this code.
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce code existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
  return NextResponse.json({ promo_code: data }, { status: 201 });
}
