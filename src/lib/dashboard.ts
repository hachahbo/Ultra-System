import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveFeatures } from "@/lib/features";
import type { Role } from "@/lib/permissions";
import type { FeatureKey, Profile, Restaurant, RestaurantFeature } from "@/lib/types";

export type SessionContext = {
  profile: Profile;
  restaurant: Restaurant;
  features: Record<FeatureKey, boolean>;
  themeLogoUrl: string | null;
  userEmail: string | null;
};

type SessionContextRow = {
  profile: Profile;
  restaurant: Restaurant;
  features: RestaurantFeature[];
  theme_logo_url: string | null;
};

// Resolves the logged-in dashboard user and their tenant. RLS already keys
// every query off the profile's restaurant_id; this gives pages the context.
//
// Wrapped in React's cache(): the dashboard layout and the page it renders
// both call this during the same render pass, and every /api/dashboard/*
// route calls it once. cache() dedupes it to one execution per request —
// without it, a single dashboard navigation paid the whole chain twice.
export const getSessionContext = cache(
  async function getSessionContext(): Promise<SessionContext | null> {
    const supabase = await createClient();

    // getClaims() verifies the access token's signature locally with WebCrypto
    // and reads the claims out of it — no round trip to the auth server, which
    // is what getUser() cost on every single dashboard request (twice, since
    // proxy.ts calls it too).
    //
    // NOTE: this is only free if the Supabase project uses asymmetric JWT
    // signing keys (Dashboard → Authentication → JWT Keys → migrate off the
    // legacy shared secret). On a legacy HS256 secret getClaims() falls back
    // to the same network call getUser() made — correct either way, just not
    // faster until the key migration is done.
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !claimsData?.claims?.sub) return null;

    // One RPC instead of profiles → then (restaurants + features + theme).
    // Same data, same active/tenant checks, one round trip (0033).
    const { data, error } = await supabase.rpc("get_session_context");
    if (error) {
      console.error("Session context fetch error:", error);
      return null;
    }
    if (!data) return null;

    const row = data as SessionContextRow;
    const restaurant = row.restaurant;
    if (!restaurant) return null;

    return {
      profile: row.profile,
      restaurant,
      features: resolveFeatures(restaurant.plan, row.features ?? []),
      themeLogoUrl: row.theme_logo_url ?? null,
      userEmail: (claimsData.claims.email as string | undefined) ?? null,
    };
  },
);

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
