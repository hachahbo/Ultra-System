import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dayBucket, weekBucket, startOfTodayCasa } from "@/lib/time";
import type { Plan, RestaurantStatus } from "@/lib/types";

const DAYS = 30;
const PLAN_LABELS: Record<Plan, string> = { free: "Free", pro: "Pro", enterprise: "Enterprise" };

function monthlyPrice(priceMad: number, billingCycle: string): number {
  return billingCycle === "yearly" ? priceMad / 12 : priceMad;
}

export async function GET() {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const admin = createAdminClient();
  const now = new Date();
  const from30 = new Date(startOfTodayCasa(now).getTime() - (DAYS - 1) * 86_400_000);
  const from7 = new Date(now.getTime() - 7 * 86_400_000);
  const from14 = new Date(now.getTime() - 14 * 86_400_000);
  const from8Weeks = new Date(now.getTime() - 56 * 86_400_000);
  const in7Days = new Date(now.getTime() + 7 * 86_400_000).toISOString();

  const [
    { data: restaurants },
    { data: subscriptions },
    { data: orders },
    { data: items },
    { data: profiles },
    { data: expiring },
  ] = await Promise.all([
    admin
      .from("restaurants")
      .select("id, name, city, plan, status, created_at, parent_restaurant_id"),
    admin
      .from("subscriptions")
      .select("restaurant_id, status, plan_tier, billing_cycle, price_mad, created_at, updated_at"),
    admin
      .from("orders")
      .select("restaurant_id, created_at, total")
      .gte("created_at", from30.toISOString())
      .limit(20_000),
    admin.from("items").select("restaurant_id"),
    admin.from("profiles").select("id, restaurant_id, role"),
    admin
      .from("subscriptions")
      .select("restaurant_id, trial_ends_at")
      .eq("status", "trialing")
      .lte("trial_ends_at", in7Days)
      .gte("trial_ends_at", now.toISOString()),
  ]);

  const restaurantRows = (restaurants ?? []) as {
    id: string;
    name: string;
    city: string | null;
    plan: Plan;
    status: RestaurantStatus;
    created_at: string;
    parent_restaurant_id: string | null;
  }[];
  const restaurantNameById = new Map(restaurantRows.map((r) => [r.id, r.name]));

  const subscriptionRows = (subscriptions ?? []) as {
    restaurant_id: string;
    status: "active" | "trialing" | "past_due" | "canceled";
    plan_tier: Plan;
    billing_cycle: string;
    price_mad: string | number;
    created_at: string;
    updated_at: string;
  }[];

  const expiringTrials = (expiring ?? []).map((s) => ({
    restaurantId: s.restaurant_id,
    restaurantName: restaurantNameById.get(s.restaurant_id) ?? "—",
    trialEndsAt: s.trial_ends_at,
  }));

  // --- Restaurant counts -----------------------------------------------
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
  const planDistribution = (Object.keys(planCounts) as Plan[])
    .filter((p) => planCounts[p] > 0)
    .map((p) => ({
      plan: p,
      label: PLAN_LABELS[p],
      count: planCounts[p],
      pct: Math.round((planCounts[p] / restaurantRows.length) * 100),
    }));

  // --- MRR, growth, churn, ARPU, pending revenue ------------------------
  const activeSubs = subscriptionRows.filter((s) => s.status === "active" || s.status === "trialing");
  const mrr = activeSubs.reduce((sum, s) => sum + monthlyPrice(Number(s.price_mad), s.billing_cycle), 0);

  const newSubs = activeSubs.filter((s) => new Date(s.created_at) >= from30);
  const newMRR = newSubs.reduce((sum, s) => sum + monthlyPrice(Number(s.price_mad), s.billing_cycle), 0);

  const canceledThisPeriod = subscriptionRows.filter(
    (s) => s.status === "canceled" && new Date(s.updated_at) >= from30,
  );
  const churnedMRR = canceledThisPeriod.reduce(
    (sum, s) => sum + monthlyPrice(Number(s.price_mad), s.billing_cycle),
    0,
  );

  const prevMRR = mrr - newMRR + churnedMRR;
  const mrrGrowthPct = prevMRR > 0 ? ((newMRR - churnedMRR) / prevMRR) * 100 : null;

  const activeAtStart = activeSubs.length + canceledThisPeriod.length;
  const churnRatePct = activeAtStart > 0 ? (canceledThisPeriod.length / activeAtStart) * 100 : 0;

  const arpu = activeSubs.length > 0 ? mrr / activeSubs.length : 0;

  const pastDueSubs = subscriptionRows.filter((s) => s.status === "past_due");
  const pendingRevenue = pastDueSubs.reduce(
    (sum, s) => sum + monthlyPrice(Number(s.price_mad), s.billing_cycle),
    0,
  );
  const failedPaymentsCount = pastDueSubs.length;

  // --- Orders (30d) ------------------------------------------------------
  const orderRows = (orders ?? []) as { restaurant_id: string; created_at: string; total: number }[];
  const seriesMap = new Map<string, { revenue: number; orders: number }>();
  const ordersByRestaurant = new Map<string, number>();
  const orders7dByRestaurant = new Map<string, number>();
  let totalOrders = 0;
  let totalRevenue = 0;
  for (const o of orderRows) {
    const key = dayBucket(o.created_at);
    const entry = seriesMap.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(o.total);
    entry.orders += 1;
    seriesMap.set(key, entry);
    totalOrders += 1;
    totalRevenue += Number(o.total);

    ordersByRestaurant.set(o.restaurant_id, (ordersByRestaurant.get(o.restaurant_id) ?? 0) + 1);
    if (new Date(o.created_at) >= from7) {
      orders7dByRestaurant.set(o.restaurant_id, (orders7dByRestaurant.get(o.restaurant_id) ?? 0) + 1);
    }
  }
  const revenueSeries = [...seriesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // --- Acquisition vs churn, 8 weeks --------------------------------------
  const acqMap = new Map<string, { new: number; lost: number }>();
  for (const s of subscriptionRows) {
    const createdAt = new Date(s.created_at);
    if (createdAt >= from8Weeks) {
      const key = weekBucket(createdAt);
      const entry = acqMap.get(key) ?? { new: 0, lost: 0 };
      entry.new += 1;
      acqMap.set(key, entry);
    }
    if (s.status === "canceled") {
      const canceledAt = new Date(s.updated_at);
      if (canceledAt >= from8Weeks) {
        const key = weekBucket(canceledAt);
        const entry = acqMap.get(key) ?? { new: 0, lost: 0 };
        entry.lost += 1;
        acqMap.set(key, entry);
      }
    }
  }
  const acquisitionWeekly = [...acqMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({ weekLabel: week.slice(5), ...v }));

  // --- DAU / MAU (Supabase Auth last_sign_in_at, scoped to restaurant staff) --
  const profileRows = (profiles ?? []) as { id: string; restaurant_id: string; role: string }[];
  const restaurantUserIds = new Set(profileRows.map((p) => p.id));

  const allUsers: { id: string; last_sign_in_at: string | null }[] = [];
  for (let page = 1; ; page++) {
    const { data: usersPage, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !usersPage) break;
    allUsers.push(...usersPage.users.map((u) => ({ id: u.id, last_sign_in_at: u.last_sign_in_at ?? null })));
    if (usersPage.users.length < 200) break;
  }
  const staffUsers = allUsers.filter((u) => restaurantUserIds.has(u.id));
  const from24h = new Date(now.getTime() - 24 * 60 * 60_000);
  const dau = staffUsers.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= from24h).length;
  const mau = staffUsers.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= from30).length;
  const stickinessPct = mau > 0 ? (dau / mau) * 100 : 0;

  const lastSignInById = new Map(staffUsers.map((u) => [u.id, u.last_sign_in_at]));
  const ownerIdByRestaurant = new Map(
    profileRows.filter((p) => p.role === "owner").map((p) => [p.restaurant_id, p.id]),
  );
  const pastDueByRestaurant = new Set(pastDueSubs.map((s) => s.restaurant_id));

  // --- At-risk accounts ----------------------------------------------------
  type AtRisk = { id: string; name: string; reason: string; severity: "high" | "mid" };
  const atRiskAll: AtRisk[] = [];
  for (const r of restaurantRows) {
    if (r.status !== "active") continue;
    if (pastDueByRestaurant.has(r.id)) {
      atRiskAll.push({ id: r.id, name: r.name, reason: "Paiement échoué", severity: "high" });
      continue;
    }
    if ((orders7dByRestaurant.get(r.id) ?? 0) === 0) {
      atRiskAll.push({ id: r.id, name: r.name, reason: "0 commande depuis 7 jours", severity: "high" });
      continue;
    }
    const ownerId = ownerIdByRestaurant.get(r.id);
    const lastSignIn = ownerId ? lastSignInById.get(ownerId) : undefined;
    if (!lastSignIn || new Date(lastSignIn) < from14) {
      atRiskAll.push({ id: r.id, name: r.name, reason: "Aucune connexion depuis 14 j", severity: "mid" });
    }
  }
  const atRiskCount = atRiskAll.length;
  const atRiskAccounts = atRiskAll.slice(0, 8);

  // --- Recent signups --------------------------------------------------------
  const itemsByRestaurant = new Set((items ?? []).map((i) => (i as { restaurant_id: string }).restaurant_id));
  const recentSignups = [...restaurantRows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((r) => {
      const onboardingStep: "onboarding" | "menu" | "active" = !itemsByRestaurant.has(r.id)
        ? "onboarding"
        : (ordersByRestaurant.get(r.id) ?? 0) === 0
          ? "menu"
          : "active";
      return { id: r.id, name: r.name, city: r.city, createdAt: r.created_at, onboardingStep };
    });

  // --- Franchise tree ----------------------------------------------------
  const mrrByRestaurant = new Map<string, number>();
  for (const s of activeSubs) {
    mrrByRestaurant.set(
      s.restaurant_id,
      (mrrByRestaurant.get(s.restaurant_id) ?? 0) + monthlyPrice(Number(s.price_mad), s.billing_cycle),
    );
  }
  const childrenByParent = new Map<string, typeof restaurantRows>();
  for (const r of restaurantRows) {
    if (!r.parent_restaurant_id) continue;
    const list = childrenByParent.get(r.parent_restaurant_id) ?? [];
    list.push(r);
    childrenByParent.set(r.parent_restaurant_id, list);
  }
  const franchiseTree = restaurantRows
    .filter((r) => !r.parent_restaurant_id && (childrenByParent.get(r.id)?.length ?? 0) > 0)
    .map((parent) => ({
      id: parent.id,
      name: parent.name,
      plan: parent.plan,
      mrr: mrrByRestaurant.get(parent.id) ?? 0,
      orders30d: ordersByRestaurant.get(parent.id) ?? 0,
      branches: (childrenByParent.get(parent.id) ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        plan: b.plan,
        mrr: mrrByRestaurant.get(b.id) ?? 0,
        orders30d: ordersByRestaurant.get(b.id) ?? 0,
      })),
    }));

  return NextResponse.json({
    restaurantCount: restaurantRows.length,
    statusCounts,
    planCounts,
    activeSubscriptions: activeSubs.length,
    mrr,
    totalOrders,
    totalRevenue,
    revenueSeries,
    expiringTrials,
    mrrGrowthPct,
    arpu,
    churnRatePct,
    pendingRevenue,
    failedPaymentsCount,
    dau,
    mau,
    stickinessPct,
    atRiskCount,
    planDistribution,
    acquisitionWeekly,
    recentSignups,
    atRiskAccounts,
    franchiseTree,
  });
}
