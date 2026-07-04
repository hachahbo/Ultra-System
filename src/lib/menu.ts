import "server-only";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { PublicMenu, Restaurant } from "@/lib/types";

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
