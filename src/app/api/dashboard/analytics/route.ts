import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireOwner } from "@/lib/dashboard";
import { casaHour, dayBucket, startOfTodayCasa, weekBucket } from "@/lib/time";
import type { Order } from "@/lib/types";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export async function GET(request: Request) {
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "analytics");
  if (featureError) return featureError;

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "30d";
  const days = RANGE_DAYS[range] ?? 30;
  const bucketOf = days > 30 ? weekBucket : dayBucket;

  const from = new Date(startOfTodayCasa().getTime() - (days - 1) * 86_400_000);

  const supabase = await createClient();
  const [{ data: orders }, { data: customers }, { data: turnover }] = await Promise.all([
    supabase
      .from("orders")
      .select("created_at, type, total, items, customer_id")
      .gte("created_at", from.toISOString())
      .limit(10_000),
    supabase.from("customers").select("id, first_seen"),
    supabase.from("table_turnover_metrics").select("*"),
  ]);

  const rows = (orders ?? []) as Pick<
    Order,
    "created_at" | "type" | "total" | "items" | "customer_id"
  >[];

  // --- Revenue / orders series, bucketed by day (or week for 90d) ---
  const seriesMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of rows) {
    const key = bucketOf(o.created_at);
    const entry = seriesMap.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(o.total);
    entry.orders += 1;
    seriesMap.set(key, entry);
  }
  const revenueSeries = [...seriesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // --- Top 10 items by quantity sold ---
  const itemMap = new Map<string, { quantity: number; revenue: number }>();
  for (const o of rows) {
    for (const line of o.items ?? []) {
      const entry = itemMap.get(line.name) ?? { quantity: 0, revenue: 0 };
      entry.quantity += line.quantity;
      entry.revenue += line.unit_price * line.quantity;
      itemMap.set(line.name, entry);
    }
  }
  const topItems = [...itemMap.entries()]
    .sort(([, a], [, b]) => b.quantity - a.quantity)
    .slice(0, 10)
    .map(([name, v]) => ({ name, ...v }));

  // --- Dine-in vs delivery split (order count) ---
  const typeSplit = { dine_in: 0, delivery: 0 };
  for (const o of rows) {
    if (o.type === "dine_in") typeSplit.dine_in += 1;
    else typeSplit.delivery += 1;
  }

  // --- Orders by hour of day (Casablanca-local) ---
  const byHourCounts = new Array(24).fill(0);
  for (const o of rows) {
    byHourCounts[casaHour(o.created_at)] += 1;
  }
  const byHour = byHourCounts.map((count, hour) => ({ hour, orders: count }));

  // --- New vs returning customers ---
  // Only meaningful for delivery orders, which are the ones tied to a
  // customer_id/phone in this schema (dine-in orders are anonymous).
  const firstSeenById = new Map((customers ?? []).map((c) => [c.id, c.first_seen]));
  const seenCustomerIds = new Set<string>();
  let newCustomers = 0;
  let returningCustomers = 0;
  for (const o of rows) {
    if (!o.customer_id || seenCustomerIds.has(o.customer_id)) continue;
    seenCustomerIds.add(o.customer_id);
    const firstSeen = firstSeenById.get(o.customer_id);
    if (firstSeen && new Date(firstSeen) >= from) newCustomers += 1;
    else returningCustomers += 1;
  }

  // --- Table Turnover Metrics ---
  const turnoverByHour = new Array(24).fill({ duration: 0, sessions: 0 });
  if (turnover) {
    for (const t of turnover) {
      if (!t.hour_bucket) continue;
      const h = new Date(t.hour_bucket).getHours(); // UTC to local may be needed, assuming UTC=local for now
      turnoverByHour[h] = { 
        duration: Math.round(t.avg_duration_minutes ?? 0), 
        sessions: t.total_sessions ?? 0 
      };
    }
  }
  const tableTurnover = turnoverByHour.map((v, hour) => ({ hour, ...v }));

  return NextResponse.json({
    revenueSeries,
    topItems,
    typeSplit,
    byHour,
    newVsReturning: { new: newCustomers, returning: returningCustomers },
    tableTurnover,
  });
}
