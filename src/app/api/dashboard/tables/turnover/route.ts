import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireSession } from "@/lib/dashboard";

// GET /api/dashboard/tables/turnover — live occupancy + rotation metrics.
// Reuses the "floor_plan" feature flag (table_sessions is a table-level
// concept, not a separate plan tier) and the same open-to-any-staff-role
// read policy as /api/dashboard/tables (kitchen-view/reservations-view
// consume that route too).
export async function GET() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "floor_plan");
  if (featureError) return featureError;

  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [{ data: active }, { data: metrics }] = await Promise.all([
    // Currently-seated tables — auto_start_table_session (0015) inserts
    // these on dine_in order creation, auto_vacate_table_session closes
    // them when the order is marked done.
    supabase
      .from("table_sessions")
      .select("id, table_id, seated_at, customer_count, table:tables(number, seats)")
      .eq("status", "active")
      .order("seated_at", { ascending: true }),
    // table_turnover_metrics (0015) — hourly buckets, last 30 days, already
    // filtered to completed sessions. Slice to the last 7 days here.
    supabase
      .from("table_turnover_metrics")
      .select("hour_bucket, total_sessions, avg_duration_minutes")
      .gte("hour_bucket", weekAgo.toISOString())
      .order("hour_bucket", { ascending: true }),
  ]);

  const metricRows = (metrics ?? []) as {
    hour_bucket: string;
    total_sessions: number;
    avg_duration_minutes: number;
  }[];

  function summarize(since: Date) {
    const rows = metricRows.filter((r) => new Date(r.hour_bucket) >= since);
    const sessions = rows.reduce((sum, r) => sum + r.total_sessions, 0);
    const avgMinutes =
      sessions > 0
        ? rows.reduce((sum, r) => sum + r.avg_duration_minutes * r.total_sessions, 0) / sessions
        : 0;
    return { sessions, avgMinutes: Math.round(avgMinutes) };
  }

  return NextResponse.json({
    active: active ?? [],
    today: summarize(todayStart),
    week: summarize(weekAgo),
  });
}
