import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveFeatures } from "@/lib/features";
import type { Role } from "@/lib/permissions";
import type { FeatureKey, Profile, Restaurant, RestaurantFeature } from "@/lib/types";

export type SessionContext = {
  profile: Profile;
  restaurant: Restaurant;
  features: Record<FeatureKey, boolean>;
};

// Resolves the logged-in dashboard user and their tenant. RLS already keys
// every query off the profile's restaurant_id; this gives pages the context.
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, restaurant_id, role, active, must_change_password, consented_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
  }
  if (!profile) return null;
  // Soft-disabled team members lose dashboard access immediately, even with
  // a live session cookie.
  if (profile.active === false) return null;

  // Both only depend on profile.restaurant_id, not on each other — fetch in
  // parallel instead of two sequential round-trips.
  const [{ data: restaurant, error: restaurantError }, { data: overrides }] = await Promise.all([
    supabase.from("restaurants").select("*").eq("id", profile.restaurant_id).maybeSingle(),
    supabase.from("restaurant_features").select("*").eq("restaurant_id", profile.restaurant_id),
  ]);

  if (restaurantError) {
    console.error("Restaurant fetch error:", restaurantError);
  }
  if (!restaurant) return null;

  const restaurantRow = restaurant as Restaurant;
  const features = resolveFeatures(restaurantRow.plan, (overrides ?? []) as RestaurantFeature[]);

  return { profile: profile as Profile, restaurant: restaurantRow, features };
}

/** Suspended or expired-trial restaurants lose dashboard access entirely. */
export function isSuspended(restaurant: Restaurant): boolean {
  return restaurant.status === "suspended" || restaurant.status === "expired";
}

const SUSPENDED_RESPONSE = () =>
  NextResponse.json(
    { error: "Compte suspendu — contactez Darna" },
    { status: 403 },
  );

/**
 * Guard for role-scoped API routes, especially any route that also touches
 * `createAdminClient()` (service role bypasses RLS entirely, so this check
 * is the only tenant/role boundary those routes have) — RLS-backed routes
 * get a second layer for free from 0008_team_roles.sql's policies, but
 * every mutating route should still check here rather than rely on RLS
 * alone.
 *
 * Also blocks staff who still have a forced password change pending —
 * proxy/layout redirects can be bypassed by a direct API call, so every
 * mutating dashboard route re-checks this server-side.
 */
export async function requireRole(
  roles: Role[],
): Promise<{ ctx: SessionContext } | { response: NextResponse }> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return { response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  if (isSuspended(ctx.restaurant)) {
    return { response: SUSPENDED_RESPONSE() };
  }
  if (ctx.profile.must_change_password) {
    return {
      response: NextResponse.json(
        { error: "Veuillez changer votre mot de passe avant de continuer" },
        { status: 403 },
      ),
    };
  }
  if (!roles.includes(ctx.profile.role)) {
    return {
      response: NextResponse.json({ error: "Accès refusé pour ce rôle" }, { status: 403 }),
    };
  }
  return { ctx };
}

/** Guard for owner-only ("Admin") API routes. */
export async function requireOwner(): Promise<
  { ctx: SessionContext } | { response: NextResponse }
> {
  return requireRole(["owner"]);
}

/**
 * Composes with requireOwner()/requireSession(): call after the auth guard
 * passes, before touching the DB, to enforce a Super-Admin-set feature
 * toggle. Returns null when the feature is enabled.
 */
export function assertFeature(ctx: SessionContext, key: FeatureKey): NextResponse | null {
  if (ctx.features[key]) return null;
  return NextResponse.json(
    { error: "Fonctionnalité non incluse dans votre offre" },
    { status: 403 },
  );
}

/** Lighter guard for tenant routes any authenticated staff/owner may use. */
export async function requireSession(): Promise<
  { ctx: SessionContext } | { response: NextResponse }
> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return { response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  if (isSuspended(ctx.restaurant)) {
    return { response: SUSPENDED_RESPONSE() };
  }
  if (ctx.profile.must_change_password) {
    return {
      response: NextResponse.json(
        { error: "Veuillez changer votre mot de passe avant de continuer" },
        { status: 403 },
      ),
    };
  }
  return { ctx };
}
