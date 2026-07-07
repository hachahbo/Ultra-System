import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError } from "@/lib/api";

export type SuperAdminContext = {
  adminId: string;
};

/**
 * Every route under api/admin/* uses createAdminClient() (service role,
 * bypasses RLS entirely) — this guard is their only tenant/role boundary.
 * platform_admins has no RLS policy granting select-any, so membership is
 * checked with the service-role client, not the session client.
 */
export async function requireSuperAdmin(): Promise<
  { ctx: SuperAdminContext } | { response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: apiError("unauthorized", "Non autorisé", 401) };
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { response: apiError("forbidden", "Réservé à l'administrateur", 403) };
  }

  return { ctx: { adminId: user.id } };
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/**
 * For server layouts/pages (not API routes) — resolves the admin's user id or
 * null. Uses the session client, not the service role: the "platform_admins
 * self read" RLS policy lets a signed-in user read their OWN membership row,
 * which is exactly what this gate needs. This matches the check in proxy.ts
 * and login/page.tsx — routing the gate through the service-role client
 * instead would make the /admin layout disagree with the proxy whenever the
 * service key is missing/invalid, producing an infinite redirect loop.
 */
export async function getAdminContext(): Promise<{ adminId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  return { adminId: user.id };
}
