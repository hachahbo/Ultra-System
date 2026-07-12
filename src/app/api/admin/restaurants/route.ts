import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRestaurantSchema } from "@/lib/schemas";
import { startOfMonthCasa } from "@/lib/time";
import type { Restaurant } from "@/lib/types";

const DEFAULT_LIMIT = 20;

export async function GET(request: Request) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");
  const status = url.searchParams.get("status");
  const city = url.searchParams.get("city");
  const q = url.searchParams.get("q");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)));
  const sort = url.searchParams.get("sort") ?? "name";
  const order = url.searchParams.get("order") === "desc" ? false : true;

  const admin = createAdminClient();
  let query = admin.from("restaurants").select("*", { count: "exact" });
  if (plan) query = query.eq("plan", plan);
  if (status) query = query.eq("status", status);
  if (city) query = query.ilike("city", `%${city}%`);
  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  query = query
    .order(sort, { ascending: order })
    .range((page - 1) * limit, page * limit - 1);

  const { data: restaurants, count, error } = await query;
  if (error) {
    return apiError("read_failed", "Erreur de lecture", 500);
  }
  const rows = (restaurants ?? []) as Restaurant[];
  const restaurantIds = rows.map((r) => r.id);

  const monthStart = startOfMonthCasa().toISOString();
  const [{ data: monthOrders }, { data: ownerProfiles }] = await Promise.all([
    restaurantIds.length
      ? admin
          .from("orders")
          .select("restaurant_id, total")
          .in("restaurant_id", restaurantIds)
          .gte("created_at", monthStart)
          .limit(10_000)
      : Promise.resolve({ data: [] }),
    restaurantIds.length
      ? admin
          .from("profiles")
          .select("id, restaurant_id")
          .in("restaurant_id", restaurantIds)
          .eq("role", "owner")
      : Promise.resolve({ data: [] }),
  ]);

  const metricsByRestaurant = new Map<string, { revenue: number; orders: number }>();
  for (const o of monthOrders ?? []) {
    const entry = metricsByRestaurant.get(o.restaurant_id) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(o.total);
    entry.orders += 1;
    metricsByRestaurant.set(o.restaurant_id, entry);
  }

  const lastActiveByRestaurant = new Map<string, string | null>();
  await Promise.all(
    (ownerProfiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      lastActiveByRestaurant.set(p.restaurant_id, data.user?.last_sign_in_at ?? null);
    }),
  );

  const restaurantsWithMetrics = rows.map((r) => ({
    ...r,
    monthlyRevenue: metricsByRestaurant.get(r.id)?.revenue ?? 0,
    monthlyOrders: metricsByRestaurant.get(r.id)?.orders ?? 0,
    ownerLastActiveAt: lastActiveByRestaurant.get(r.id) ?? null,
  }));

  return NextResponse.json({
    restaurants: restaurantsWithMetrics,
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const parsed = createRestaurantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("invalid_input", "Données invalides", 400);
  }
  const input = parsed.data;

  const admin = createAdminClient();

  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .insert({
      name: input.name,
      slug: input.slug,
      city: input.city ?? null,
      plan: input.plan,
      currency: input.currency,
    })
    .select("*")
    .single();
  if (restaurantError || !restaurant) {
    return apiError("create_failed", restaurantError?.message ?? "Création impossible", 400);
  }

  // Every restaurant needs a theme row (Site Builder reads/writes it, and
  // resolveTheme(null) is only a defensive fallback). Insert right after the
  // restaurant so the FK cascade covers it in every rollback below.
  const { error: themeError } = await admin
    .from("restaurant_theme")
    .insert({ restaurant_id: restaurant.id });
  if (themeError) {
    await admin.from("restaurants").delete().eq("id", restaurant.id);
    return apiError("create_failed", "Création impossible", 500);
  }

  const { error: subscriptionError } = await admin.from("subscriptions").insert({
    restaurant_id: restaurant.id,
    plan_tier: input.plan,
    status: "active",
  });
  if (subscriptionError) {
    await admin.from("restaurants").delete().eq("id", restaurant.id);
    return apiError("create_failed", "Création impossible", 500);
  }

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email: input.ownerEmail,
    password: input.ownerPassword,
    email_confirm: true,
  });
  if (createUserError || !created.user) {
    await admin.from("restaurants").delete().eq("id", restaurant.id);
    return apiError("create_failed", createUserError?.message ?? "Création impossible", 400);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    restaurant_id: restaurant.id,
    role: "owner",
    must_change_password: true,
  });
  if (profileError) {
    // Roll back the auth user and the restaurant so we don't leave orphans.
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("restaurants").delete().eq("id", restaurant.id);
    return apiError("create_failed", "Création impossible", 500);
  }

  await logAdminAction(guard.ctx.adminId, "restaurant.create", restaurant.id, {
    name: input.name,
    slug: input.slug,
    plan: input.plan,
    ownerEmail: input.ownerEmail,
  });

  return NextResponse.json({ id: restaurant.id }, { status: 201 });
}
