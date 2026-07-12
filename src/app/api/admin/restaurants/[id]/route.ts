import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminRestaurantPatchSchema } from "@/lib/schemas";
import { resolveFeaturesWithSource } from "@/lib/features";
import { dayBucket, startOfTodayCasa } from "@/lib/time";
import type { Restaurant, RestaurantFeature } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const admin = createAdminClient();
  const from = new Date(startOfTodayCasa().getTime() - 29 * 86_400_000);

  const [
    { data: restaurant },
    { data: subscription },
    { data: features },
    { data: orders },
    { count: orderCount },
    { data: auditEntries },
  ] = await Promise.all([
    admin.from("restaurants").select("*").eq("id", id).maybeSingle(),
    admin.from("subscriptions").select("*").eq("restaurant_id", id).maybeSingle(),
    admin.from("restaurant_features").select("*").eq("restaurant_id", id),
    admin
      .from("orders")
      .select("created_at, total")
      .eq("restaurant_id", id)
      .gte("created_at", from.toISOString())
      .limit(10_000),
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", id),
    admin
      .from("audit_logs")
      .select("*")
      .eq("target_restaurant_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!restaurant) {
    return apiError("not_found", "Restaurant introuvable", 404);
  }

  const seriesMap = new Map<string, number>();
  for (const o of orders ?? []) {
    const key = dayBucket(o.created_at);
    seriesMap.set(key, (seriesMap.get(key) ?? 0) + Number(o.total));
  }
  const revenueSeries = [...seriesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  const rest = restaurant as Restaurant;
  const featureRows = (features ?? []) as RestaurantFeature[];

  return NextResponse.json({
    restaurant: rest,
    subscription: subscription ?? null,
    features: resolveFeaturesWithSource(rest.plan, featureRows),
    revenueSeries,
    orderCount: orderCount ?? 0,
    recentAuditEntries: auditEntries ?? [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const parsed = adminRestaurantPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return apiError("invalid_input", "Données invalides", 400);
  }
  const input = parsed.data;

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) {
    return apiError("not_found", "Restaurant introuvable", 404);
  }

  const { data: updated, error } = await admin
    .from("restaurants")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !updated) {
    return apiError("update_failed", "Mise à jour impossible", 500);
  }

  // Plan changes also update the subscription's plan_tier so both stay in sync.
  if (input.plan && input.plan !== before.plan) {
    await admin
      .from("subscriptions")
      .update({ plan_tier: input.plan, updated_at: new Date().toISOString() })
      .eq("restaurant_id", id);
    await logAdminAction(guard.ctx.adminId, "plan.change", id, {
      from: before.plan,
      to: input.plan,
    });
  }
  if (input.status && input.status !== before.status) {
    await logAdminAction(
      guard.ctx.adminId,
      input.status === "suspended" ? "restaurant.suspend" : "restaurant.status_change",
      id,
      { from: before.status, to: input.status },
    );
  }
  if (input.name || input.city !== undefined) {
    await logAdminAction(guard.ctx.adminId, "restaurant.update", id, {
      name: input.name,
      city: input.city,
    });
  }

  return NextResponse.json({ restaurant: updated as Restaurant });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const admin = createAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, slug, status")
    .eq("id", id)
    .maybeSingle();
  if (!restaurant) {
    return apiError("not_found", "Restaurant introuvable", 404);
  }

  const url = new URL(request.url);
  const confirm = url.searchParams.get("confirm");

  if (confirm === restaurant.slug) {
    // True delete, confirmed by typing the slug — relies on the existing
    // on-delete-cascade chain (profiles, orders, categories, items, ...).
    const { error } = await admin.from("restaurants").delete().eq("id", id);
    if (error) {
      return apiError("delete_failed", "Suppression impossible", 500);
    }
    await logAdminAction(guard.ctx.adminId, "restaurant.delete", null, {
      slug: restaurant.slug,
    });
    return NextResponse.json({ ok: true, deleted: true });
  }

  // Default: soft-delete via suspension.
  const { error } = await admin
    .from("restaurants")
    .update({ status: "suspended", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return apiError("update_failed", "Suspension impossible", 500);
  }
  await logAdminAction(guard.ctx.adminId, "restaurant.suspend", id, {
    from: restaurant.status,
    to: "suspended",
  });
  return NextResponse.json({ ok: true, deleted: false });
}
