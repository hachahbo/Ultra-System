import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/vitals — Real User Monitoring sink for WebVitalsReporter
// (src/components/web-vitals-reporter.tsx). Public by necessity (fires from
// every visitor's browser, logged in or not) — the web_vitals table has no
// RLS write policy, so this route is the only way in, and it never returns
// data, only accepts it. Never fail the caller's page load over analytics.
const vitalSchema = z.object({
  name: z.enum(["CLS", "LCP", "INP", "FCP", "TTFB"]),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  pathname: z.string().max(500),
  connectionType: z.string().max(50).optional(),
});

export async function POST(request: Request) {
  try {
    const body = vitalSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ ok: false }, { status: 400 });

    const { name, value, rating, pathname, connectionType } = body.data;
    const slugMatch = pathname.match(/^\/([^/]+)(?:\/|$)/);
    const firstSegment = slugMatch?.[1] ?? null;
    // Only treat the first path segment as a restaurant slug when it isn't
    // one of the app's own top-level routes.
    const reservedRoutes = new Set(["dashboard", "admin", "login", "change-password"]);
    const slug = firstSegment && !reservedRoutes.has(firstSegment) ? firstSegment : null;

    const admin = createAdminClient();
    await admin.from("web_vitals").insert({
      pathname,
      slug,
      metric_name: name,
      value: Math.round(value * 100) / 100,
      rating: rating ?? null,
      connection_type: connectionType ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
