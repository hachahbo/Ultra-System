import "server-only";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFeatures } from "@/lib/features";
import { resolveTheme } from "@/lib/theme";
import type {
  FeatureKey,
  PublicMenu,
  ResolvedTheme,
  Restaurant,
  RestaurantFeature,
} from "@/lib/types";

// Public menu reads use the anon key (RLS allows public SELECT on
// restaurants/categories/items) and are cached ~60s so a busy public page
// doesn't hammer the DB (plan.md §6).

function anonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export const getRestaurantBySlug = unstable_cache(
  async (slug: string): Promise<Restaurant | null> => {
    const { data } = await anonClient()
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return data as Restaurant | null;
  },
  ["restaurant-by-slug"],
  { revalidate: 60, tags: ["menu"] },
);

export const getPublicMenu = unstable_cache(
  async (slug: string): Promise<PublicMenu | null> => {
    const supabase = anonClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!restaurant) return null;

    const [{ data: categories }, { data: items }] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("sort_order"),
      supabase
        .from("items")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("sort_order"),
    ]);

    return {
      restaurant: restaurant as Restaurant,
      categories: categories ?? [],
      items: items ?? [],
    } as PublicMenu;
  },
  ["public-menu"],
  { revalidate: 60, tags: ["menu"] },
);

// Feature toggles gate what the public site renders (cart/checkout,
// reservation form). restaurant_features has no public RLS read policy —
// this uses the service role read-only, scoped to a single restaurant's
// plan + overrides, same cache/tag as the rest of the public menu data so a
// Super Admin permission change is visible within the same ~60s window.
export const getPublicFeatures = unstable_cache(
  async (restaurantId: string, plan: Restaurant["plan"]): Promise<Record<FeatureKey, boolean>> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("restaurant_features")
      .select("*")
      .eq("restaurant_id", restaurantId);
    return resolveFeatures(plan, (data ?? []) as RestaurantFeature[]);
  },
  ["public-features"],
  { revalidate: 60, tags: ["menu"] },
);

// Theme (branding) read for the public site. restaurant_theme has RLS enabled
// with zero policies (service-role only, like restaurant_features), so this
// uses the admin client — same pattern as getPublicFeatures above. The
// `draft` column is explicitly excluded from the select: this is the one
// read path a non-admin visitor can reach, so a draft-in-progress must never
// leak here. Same "menu" tag/revalidate window as the rest of the public
// data — a theme publish calls revalidateTag("menu","max") too.
export const getPublicTheme = unstable_cache(
  async (restaurantId: string): Promise<ResolvedTheme> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("restaurant_theme")
      .select(
        "restaurant_id, color_primary, color_secondary, color_background, color_text, font_pair, logo_url, hero_image_urls, about_title, about_body, address, sections, custom_copy, updated_at",
      )
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    return resolveTheme(data as ResolvedTheme | null, restaurantId);
  },
  ["public-theme"],
  { revalidate: 60, tags: ["menu"] },
);
