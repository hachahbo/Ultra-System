import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Restaurant } from "@/lib/types";

export type SessionContext = {
  profile: Profile;
  restaurant: Restaurant;
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
    .select("id, restaurant_id, role, must_change_password, consented_at")
    .eq("id", user.id)
    .maybeSingle();
  
  if (profileError) {
    console.error("Profile fetch error:", profileError);
  }
  if (!profile) return null;

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", profile.restaurant_id)
    .maybeSingle();
    
  if (restaurantError) {
    console.error("Restaurant fetch error:", restaurantError);
  }
  if (!restaurant) return null;

  return { profile: profile as Profile, restaurant: restaurant as Restaurant };
}

/**
 * Guard for owner-only API routes, especially any route that also touches
 * `createAdminClient()` (service role bypasses RLS entirely, so this check
 * is the only tenant/role boundary those routes have).
 *
 * Also blocks staff who still have a forced password change pending —
 * middleware/layout redirects can be bypassed by a direct API call, so every
 * mutating dashboard route re-checks this server-side.
 */
export async function requireOwner(): Promise<
  { ctx: SessionContext } | { response: NextResponse }
> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return { response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  if (ctx.profile.must_change_password) {
    return {
      response: NextResponse.json(
        { error: "Veuillez changer votre mot de passe avant de continuer" },
        { status: 403 },
      ),
    };
  }
  if (ctx.profile.role !== "owner") {
    return {
      response: NextResponse.json({ error: "Réservé au propriétaire" }, { status: 403 }),
    };
  }
  return { ctx };
}

/** Lighter guard for tenant routes any authenticated staff/owner may use. */
export async function requireSession(): Promise<
  { ctx: SessionContext } | { response: NextResponse }
> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return { response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
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
