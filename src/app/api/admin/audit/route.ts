import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_LIMIT = 30;

export async function GET(request: Request) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const restaurantId = url.searchParams.get("restaurantId");
  const action = url.searchParams.get("action");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)));

  const admin = createAdminClient();
  let query = admin.from("audit_logs").select("*", { count: "exact" });
  if (restaurantId) query = query.eq("target_restaurant_id", restaurantId);
  if (action) query = query.eq("action", action);
  query = query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data: entries, count, error } = await query;
  if (error) {
    return apiError("read_failed", "Erreur de lecture", 500);
  }

  const restaurantIds = [...new Set((entries ?? []).map((e) => e.target_restaurant_id).filter(Boolean))];
  const { data: restaurants } = restaurantIds.length
    ? await admin.from("restaurants").select("id, name").in("id", restaurantIds)
    : { data: [] };
  const nameById = new Map((restaurants ?? []).map((r) => [r.id, r.name]));

  const rows = (entries ?? []).map((e) => ({
    ...e,
    targetRestaurantName: e.target_restaurant_id ? nameById.get(e.target_restaurant_id) ?? null : null,
  }));

  return NextResponse.json({ entries: rows, total: count ?? 0, page, limit });
}
