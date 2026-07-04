import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Restaurant } from "@/lib/types";

// Resolves the logged-in dashboard user and their tenant. RLS already keys
// every query off the profile's restaurant_id; this gives pages the context.
export async function getSessionContext(): Promise<{
  profile: Profile;
  restaurant: Restaurant;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, restaurant_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", profile.restaurant_id)
    .maybeSingle();
  if (!restaurant) return null;

  return { profile: profile as Profile, restaurant: restaurant as Restaurant };
}
