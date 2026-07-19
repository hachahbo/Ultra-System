import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFeatures } from "@/lib/features";
import type { Plan, RestaurantFeature } from "@/lib/types";

// Restaurants + their resolved feature set (plan defaults + per-restaurant
// overrides), for the bulk-permissions table's "Fonctionnalités actives"
// column. Small dataset (every restaurant, unpaginated) — same "read
// everything, it's a handful of rows" approach as the admin analytics route.
export async function GET() {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const admin = createAdminClient();
  const [{ data: restaurants, error }, { data: overrides }] = await Promise.all([
    admin.from("restaurants").select("id, name, plan").order("name"),
    admin.from("restaurant_features").select("*"),
  ]);
  if (error) {
    return apiError("read_failed", "Erreur de lecture", 500);
  }

  const overridesByRestaurant = new Map<string, RestaurantFeature[]>();
  for (const o of (overrides ?? []) as RestaurantFeature[]) {
    const list = overridesByRestaurant.get(o.restaurant_id) ?? [];
    list.push(o);
    overridesByRestaurant.set(o.restaurant_id, list);
  }

  const rows = ((restaurants ?? []) as { id: string; name: string; plan: Plan }[]).map((r) => {
    const resolved = resolveFeatures(r.plan, overridesByRestaurant.get(r.id) ?? []);
    const activeFeatures = (Object.keys(resolved) as (keyof typeof resolved)[]).filter((k) => resolved[k]);
    return { id: r.id, name: r.name, plan: r.plan, activeFeatures };
  });

  return NextResponse.json({ restaurants: rows });
}
