import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/dashboard";
import { dayBucket, casaHour, startOfTodayCasa } from "@/lib/time";
import { dailyBuckets, last7Keys, keyDaysAgo, deltaPct } from "@/lib/dashboard-stats";
import { OverviewView } from "@/components/dashboard/overview-view";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";
import type { Item, Order, Reservation } from "@/lib/types";

export const metadata: Metadata = { title: "Aperçu" };

const HISTORY_DAYS = 14;

export default async function OverviewPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessRoute(ctx.profile.role, "/dashboard")) redirect(defaultRouteFor(ctx.profile.role));

  const supabase = await createClient();
  const now = new Date();
  const todayKey = dayBucket(now);
  const historyFrom = new Date(startOfTodayCasa(now).getTime() - (HISTORY_DAYS - 1) * 86_400_000);

  const [ordersRes, reservationsRecentRes, reservationsTodayRes, customersRecentRes, pendingReservationsRes, newCustomersRes, outOfStockRes, lastOrdersRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, type, table_number, customer_name, items, total, status, created_at")
        .gte("created_at", historyFrom.toISOString()),
      supabase
        .from("reservations")
        .select("id, created_at")
        .gte("created_at", historyFrom.toISOString()),
      supabase
        .from("reservations")
        .select("id, customer_name, party_size, time, status")
        .eq("date", todayKey)
        .order("time", { ascending: true }),
      supabase
        .from("customers")
        .select("id, first_seen")
        .gte("first_seen", historyFrom.toISOString()),
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .gte("first_seen", startOfTodayCasa(now).toISOString()),
      supabase
        .from("items")
        .select("id, name_fr")
        .eq("in_stock", false)
        .limit(6),
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const orders = (ordersRes.data ?? []) as Pick<
    Order,
    "id" | "type" | "table_number" | "customer_name" | "items" | "total" | "status" | "created_at"
  >[];
  const reservationsRecent = (reservationsRecentRes.data ?? []) as Pick<Reservation, "id" | "created_at">[];
  const todaysReservations = (reservationsTodayRes.data ?? []) as Pick<
    Reservation,
    "id" | "customer_name" | "party_size" | "time" | "status"
  >[];
  const customersRecent = (customersRecentRes.data ?? []) as { id: string; first_seen: string }[];
  const outOfStockItems = (outOfStockRes.data ?? []) as Pick<Item, "id" | "name_fr">[];
  const lastOrders = (lastOrdersRes.data ?? []) as Order[];

  // --- Orders / revenue: today, 7-day series, same-weekday-last-week delta ---
  const orderCountByDay = dailyBuckets(orders, (o) => o.created_at);
  const revenueByDay = dailyBuckets(orders, (o) => o.created_at, (o) => Number(o.total));
  const week = last7Keys(now);
  const lastWeekKey = keyDaysAgo(7, now);

  const ordersToday = orderCountByDay.get(todayKey) ?? 0;
  const ordersSeries = week.map((k) => orderCountByDay.get(k) ?? 0);
  const ordersDeltaPct = deltaPct(ordersToday, orderCountByDay.get(lastWeekKey) ?? 0);

  const revenueToday = revenueByDay.get(todayKey) ?? 0;
  const revenueSeries = week.map((k) => revenueByDay.get(k) ?? 0);
  const revenueDeltaPct = deltaPct(revenueToday, revenueByDay.get(lastWeekKey) ?? 0);

  // --- Reservations: pending count (unchanged business logic), "new since yesterday" delta ---
  const reservationCreatedByDay = dailyBuckets(reservationsRecent, (r) => r.created_at);
  const reservationsSeries = week.map((k) => reservationCreatedByDay.get(k) ?? 0);
  const reservationsDeltaPct = deltaPct(
    reservationCreatedByDay.get(todayKey) ?? 0,
    reservationCreatedByDay.get(keyDaysAgo(1, now)) ?? 0,
  );
  const pendingReservations = pendingReservationsRes.count ?? 0;

  // --- New customers: today count (unchanged business logic), vs same weekday last week ---
  const customersByDay = dailyBuckets(customersRecent, (c) => c.first_seen);
  const customersSeries = week.map((k) => customersByDay.get(k) ?? 0);
  const customersDeltaPct = deltaPct(customersByDay.get(todayKey) ?? 0, customersByDay.get(lastWeekKey) ?? 0);
  const newCustomers = newCustomersRes.count ?? 0;

  // --- Today's hourly rhythm ---
  const hourlyCounts = new Array(24).fill(0);
  for (const o of orders) {
    if (dayBucket(o.created_at) === todayKey) hourlyCounts[casaHour(o.created_at)] += 1;
  }
  const hourly = hourlyCounts.map((count, hour) => ({ hour, orders: count }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Aperçu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Un coup d&apos;œil rapide sur la journée.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <DashboardToolbar />
          <div className="flex items-center gap-2.5 rounded-full border bg-card p-1.5 pr-4 shadow-sm">
            <div className="flex size-[30px] items-center justify-center rounded-full bg-primary text-[13px] font-extrabold text-primary-foreground">
              {ctx.restaurant.name.charAt(0).toUpperCase()}
            </div>
            <p className="font-display text-[13.5px] font-bold leading-tight">
              {ctx.restaurant.name}
              <span className="block text-[11px] font-semibold text-muted-foreground">
                Gérant
              </span>
            </p>
          </div>
        </div>
      </div>

      {outOfStockItems.length > 0 && (
        <Link
          href="/dashboard/menu"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span className="text-sm">
            {outOfStockItems.length} article
            {outOfStockItems.length > 1 ? "s" : ""} en rupture — Mettre à jour
          </span>
        </Link>
      )}

      <OverviewView
        currency={ctx.restaurant.currency}
        ordersToday={ordersToday}
        ordersDeltaPct={ordersDeltaPct}
        ordersSeries={ordersSeries}
        revenueToday={revenueToday}
        revenueDeltaPct={revenueDeltaPct}
        revenueSeries={revenueSeries}
        pendingReservations={pendingReservations}
        reservationsDeltaPct={reservationsDeltaPct}
        reservationsSeries={reservationsSeries}
        newCustomers={newCustomers}
        customersDeltaPct={customersDeltaPct}
        customersSeries={customersSeries}
        hourly={hourly}
        lastOrders={lastOrders}
        todaysReservations={todaysReservations}
      />
    </div>
  );
}
