import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Backs public write endpoints (orders/reservations) with the Postgres
// token-bucket in 0011_rate_limits.sql. Single-datastore choice — this
// project has one datastore (Supabase Postgres); no Redis/Upstash for this.
//
// Fails OPEN: if the rate-limit check itself errors (network blip, RPC
// down), real traffic is not blocked. The alternative — fail closed — would
// mean a rate-limiter outage takes down order intake, which is worse than
// the throttle being briefly ineffective.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  const row = data?.[0] as { allowed: boolean; current_count: number } | undefined;
  if (error || !row) {
    console.error("[rate-limit] check failed, failing open:", error?.message);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return { allowed: row.allowed, retryAfterSeconds: row.allowed ? 0 : windowSeconds };
}

// Best-effort client IP from standard proxy headers (Vercel/most hosts set
// x-forwarded-for; fall back to a constant so unattributable requests still
// share one bucket instead of bypassing the limiter entirely).
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSeconds),
    },
  });
}
