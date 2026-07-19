import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Deliberately unpaginated (ROADMAP.md Phase 2 Task 2.5): the client
// (subscriptions-view.tsx) computes its summary strip and status filters
// over the full array. Pagination here needs a matching frontend redesign
// (server-side summary + filtering) to avoid silently wrong numbers on
// page 2+ — not just a query-param bolt-on. Revisit once tenant count
// approaches ~200; today's dataset is a handful of rows.
export async function GET() {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const admin = createAdminClient();
  const [{ data: subscriptions, error }, { data: restaurants }] = await Promise.all([
    admin.from("subscriptions").select("*").order("created_at", { ascending: false }),
    admin.from("restaurants").select("id, name, slug, currency, status"),
  ]);
  if (error) {
    return apiError("read_failed", "Erreur de lecture", 500);
  }

  const restaurantById = new Map((restaurants ?? []).map((r) => [r.id, r]));
  const rows = (subscriptions ?? []).map((s) => ({
    ...s,
    restaurant: restaurantById.get(s.restaurant_id) ?? null,
  }));

  return NextResponse.json({ subscriptions: rows });
}
