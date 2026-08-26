import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertFeature, requireRole } from "@/lib/dashboard";

const bodySchema = z.object({ in_stock: z.boolean() });

// ---------------------------------------------------------------------------
// PATCH /api/dashboard/items/[id]/availability
//
// The one menu write a waiter is allowed: marking a dish 86'd while reviewing
// a pending order. Everything else about an item stays owner/manager-only.
//
// This is a separate route rather than a widened PATCH /items/[id] because the
// `items` write policy is owner/manager-only at the RLS layer
// (0008_team_roles.sql:50-53), and Postgres has no column-level RLS to carve
// out `in_stock` alone. So the route uses the service role — which bypasses
// RLS entirely — and therefore has to be its own tenant boundary: the update
// is pinned to ctx.restaurant.id, and the single-field schema means no other
// column can ride along in the body.
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireRole(["owner", "manager", "serveur"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "menu_editor");
  if (featureError) return featureError;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("items")
    .update({ in_stock: parsed.data.in_stock })
    .eq("id", id)
    // Service role bypasses RLS, so this predicate IS the tenant check.
    .eq("restaurant_id", guard.ctx.restaurant.id)
    .select("id, in_stock")
    .maybeSingle();

  if (error) {
    console.error(`PATCH /api/dashboard/items/${id}/availability db error:`, error);
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  revalidateTag("menu", "max");
  return NextResponse.json({ item: data });
}
