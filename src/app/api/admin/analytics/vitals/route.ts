import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/analytics/vitals?days=7 — P75 Core Web Vitals per surface
// (storefront/dashboard/admin), last N days. get_web_vitals_p75
// (0017_web_vitals.sql) does the percentile math in Postgres.
export async function GET(request: Request) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? "7")));

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_web_vitals_p75", { days_back: days });
  if (error) return apiError("read_failed", "Erreur de lecture", 500);

  return NextResponse.json({ vitals: data ?? [] });
}
