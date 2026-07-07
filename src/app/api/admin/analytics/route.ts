import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dayBucket, startOfTodayCasa } from "@/lib/time";
import type { Plan, RestaurantStatus } from "@/lib/types";

const DAYS = 30;

export async function GET() {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const admin = createAdminClient();
  const from = new Date(startOfTodayCasa().getTime() - (DAYS - 1) * 86_400_000);

  const in7Days = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const [{ data: restaurants }, { data: subscriptions }, { data: orders }, { data: expiring }] =
    await Promise.all([
      admin.from("restaurants").select("id, name, plan, status"),
      admin
        .from("subscriptions")
        .select("status, plan_tier, billing_cycle, price_mad")
        .in("status", ["active", "trialing"]),
      admin
        .from("orders")
        .select("created_at, total")
        .gte("created_at", from.toISOString())
        .limit(10_000),
      admin
        .from("subscriptions")
        .select("restaurant_id, trial_ends_at")
        .eq("status", "trialing")
        .lte("trial_ends_at", in7Days)
        .gte("trial_ends_at", new Date().toISOString()),
    ]);

  const restaurantRows = (restaurants ?? []) as {
    id: string;
    name: string;
    plan: Plan;
    status: RestaurantStatus;
  }[];
  const restaurantNameById = new Map(restaurantRows.map((r) => [r.id, r.name]));
  const expiringTrials = (expiring ?? []).map((s) => ({
    restaurantId: s.restaurant_id,
    restaurantName: restaurantNameById.get(s.restaurant_id) ?? "—",
    trialEndsAt: s.trial_ends_at,
  }));

  const statusCounts: Record<RestaurantStatus, number> = {
    active: 0,
    trial: 0,
    suspended: 0,
    expired: 0,
  };
  const planCounts: Record<Plan, number> = { free: 0, pro: 0, enterprise: 0 };
  for (const r of restaurantRows) {
    statusCounts[r.status] += 1;
    planCounts[r.plan] += 1;
  }

  // MRR: normalize yearly billing down to a monthly figure.
  const mrr = (subscriptions ?? []).reduce((sum, s) => {
    const monthly = s.billing_cycle === "yearly" ? Number(s.price_mad) / 12 : Number(s.price_mad);
    return sum + monthly;
  }, 0);

  const seriesMap = new Map<string, { revenue: number; orders: number }>();
  let totalOrders = 0;
  let totalRevenue = 0;
  for (const o of orders ?? []) {
    const key = dayBucket(o.created_at);
    const entry = seriesMap.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(o.total);
    entry.orders += 1;
    seriesMap.set(key, entry);
    totalOrders += 1;
    totalRevenue += Number(o.total);
  }
  const revenueSeries = [...seriesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return NextResponse.json({
    restaurantCount: restaurantRows.length,
    statusCounts,
    planCounts,
    activeSubscriptions: (subscriptions ?? []).length,
    mrr,
    totalOrders,
    totalRevenue,
    revenueSeries,
    expiringTrials,
  });
}
