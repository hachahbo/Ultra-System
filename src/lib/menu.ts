import "server-only";
import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFeatures } from "@/lib/features";
import { localizeEvents, localizeMenu, localizeTheme } from "@/lib/i18n-content";
import { resolveTheme } from "@/lib/theme";
import type {
  FeatureKey,
  PublicMenu,
  ResolvedTheme,
  Restaurant,
  RestaurantEvent,
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

// The cached reads below deliberately stay locale-agnostic — they return the
// raw rows including the `i18n` bag, and the exported wrappers apply the
// active locale per request (localize* in src/lib/i18n-content.ts). Putting
// the locale inside the cache key instead would double every entry for no
// gain, and localizing *inside* unstable_cache would serve one visitor's
// language to everyone.
const getPublicMenuRows = unstable_cache(
  async (slug: string): Promise<PublicMenu | null> => {
    const supabase = anonClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!restaurant) return null;

    const [{ data: categories }, { data: items }, { data: availableItems }, { data: promotions }] =
      await Promise.all([
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
        // get_available_menu (0013_recipes.sql) returns the subset of
        // in_stock=true items whose recipe ingredients still cover ≥1
        // serving — items with no recipe are always included. Used below
        // to auto-86 recipe-linked items while still listing everything
        // (grayed out), matching the existing manual-86 UX rather than
        // hiding items outright.
        supabase.rpc("get_available_menu", { rid: restaurant.id }),
        supabase
          .from("promotions")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .eq("active", true)
          .order("sort_order"),
      ]);

    const availableIds = new Set((availableItems ?? []).map((i: { id: string }) => i.id));
    const itemsWithAvailability = (items ?? []).map((item) => ({
      ...item,
      in_stock: item.in_stock && availableIds.has(item.id),
    }));

    return {
      restaurant: restaurant as Restaurant,
      categories: categories ?? [],
      items: itemsWithAvailability,
      promotions: promotions ?? [],
    } as PublicMenu;
  },
  ["public-menu"],
  { revalidate: 60, tags: ["menu"] },
);

export async function getPublicMenu(slug: string): Promise<PublicMenu | null> {
  const menu = await getPublicMenuRows(slug);
  return menu && localizeMenu(menu, await getLocale());
}

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

// Public events for the /[slug]/events page. `events` has no anon RLS read
// policy (dashboard-only "tenant read"), so this uses the service role
// read-only, scoped to one restaurant. Cancelled/completed events are hidden
// from the public list. Cached + tagged "events"; dashboard writes call
// revalidateTag("events", "max").
const getPublicEventRows = unstable_cache(
  async (restaurantId: string): Promise<RestaurantEvent[]> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("events")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .in("status", ["upcoming", "sold_out"])
      .order("start_date", { ascending: true });
    return (data ?? []) as RestaurantEvent[];
  },
  ["public-events"],
  { revalidate: 60, tags: ["events"] },
);

export async function getPublicEvents(restaurantId: string): Promise<RestaurantEvent[]> {
  return localizeEvents(await getPublicEventRows(restaurantId), await getLocale());
}

// Theme (branding) read for the public site. restaurant_theme has RLS enabled
// with zero policies (service-role only, like restaurant_features), so this
// uses the admin client — same pattern as getPublicFeatures above. The
// `draft` column is explicitly excluded from the select: this is the one
// read path a non-admin visitor can reach, so a draft-in-progress must never
// leak here. Same "menu" tag/revalidate window as the rest of the public
// data — a theme publish calls revalidateTag("menu","max") too.
const getPublicThemeRow = unstable_cache(
  async (restaurantId: string): Promise<ResolvedTheme> => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("restaurant_theme")
      .select(
        "restaurant_id, color_primary, color_secondary, color_background, color_text, font_pair, logo_url, hero_image_urls, about_title, about_body, address, sections, custom_copy, welcome_gallery_urls, values_items, testimonials, about_gallery_urls, about_rating, about_review_count, about_map_url, specials_image_url, social_facebook_url, social_instagram_url, social_twitter_url, i18n, updated_at",
      )
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    // A *failed* read is not the same thing as "this restaurant has no theme
    // row yet", but `data` is null for both. Silently returning DEFAULT_THEME
    // on an error strips the restaurant's colours, fonts, hero images and copy
    // and looks exactly like a design bug — which is how a missing `i18n`
    // column (migration 0023) cost a full debugging cycle. Fail loudly
    // instead; only a genuinely absent row falls through to the defaults.
    if (error) {
      throw new Error(
        `restaurant_theme read failed for ${restaurantId}: ${error.message}. ` +
          "Schema drift? Check that every migration in supabase/migrations has been applied.",
      );
    }
    return resolveTheme(data as ResolvedTheme | null, restaurantId);
  },
  ["public-theme"],
  { revalidate: 60, tags: ["menu"] },
);

export async function getPublicTheme(restaurantId: string): Promise<ResolvedTheme> {
  return localizeTheme(await getPublicThemeRow(restaurantId), await getLocale());
}
