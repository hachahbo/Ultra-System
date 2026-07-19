import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/restaurants/franchise — lightweight, unpaginated list of
// every restaurant's id/name/slug/parent_restaurant_id, for the franchise
// link/unlink picker (RestaurantDetailPanel). Deliberately unpaginated —
// same tradeoff as /api/admin/permissions and /api/admin/subscriptions
// (ROADMAP.md Phase 2 Task 2.5): the picker needs the full tree to compute
// valid-parent candidates and each restaurant's children client-side;
// fine at pilot scale, revisit past ~200 tenants.
export async function GET() {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurants")
    .select("id, name, slug, parent_restaurant_id")
    .order("name");

  if (error) return apiError("read_failed", "Erreur de lecture", 500);
  return NextResponse.json({ restaurants: data ?? [] });
}
