import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertFeature, requireRole } from "@/lib/dashboard";

// GET /api/dashboard/labor?days=14 — owner/manager only. Hours + cost per
// staff member (labor_summary view, 0018) plus who's currently clocked in.
// Reuses the "staff_management" feature flag — labor tracking is a staff
// concern, not a separate plan tier.
export async function GET(request: Request) {
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "staff_management");
  if (featureError) return featureError;

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? "14")));
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: summary, error }, { data: active }] = await Promise.all([
    supabase
      .from("labor_summary")
      .select("profile_id, day, hours, hourly_rate_mad, cost_mad")
      .gte("day", since)
      .order("day", { ascending: false }),
    supabase
      .from("shifts")
      .select("id, profile_id, clock_in")
      .is("clock_out", null)
      .order("clock_in", { ascending: true }),
  ]);

  if (error) return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });

  const profileIds = new Set([
    ...(summary ?? []).map((r) => r.profile_id),
    ...(active ?? []).map((r) => r.profile_id),
  ]);
  const admin = createAdminClient();
  const emailById = new Map<string, string>();
  await Promise.all(
    [...profileIds].map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      emailById.set(id, data.user?.email ?? "—");
    }),
  );

  return NextResponse.json({
    summary: (summary ?? []).map((r) => ({ ...r, email: emailById.get(r.profile_id) ?? "—" })),
    active: (active ?? []).map((r) => ({ ...r, email: emailById.get(r.profile_id) ?? "—" })),
  });
}
