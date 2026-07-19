import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getAdminContext } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicTheme } from "@/lib/menu";
import { mergeDraft, resolveTheme } from "@/lib/theme";
import type { Restaurant, RestaurantTheme, ResolvedTheme } from "@/lib/types";

export const PREVIEW_COOKIE = "darna_preview";

/**
 * Resolves the theme a [slug] page should render.
 *
 * Preview path: only taken when the `darna_preview` cookie names THIS
 * restaurant AND the request carries a live Super Admin session
 * (getAdminContext — re-verified on every call, not trusted from the cookie
 * alone). In that case the theme is read fresh (no cache) via the service
 * role, including the draft, and the draft is merged over the live values.
 *
 * Everything else (the vast majority of traffic — real customers) hits the
 * normal cached public read (getPublicTheme), which never touches `draft`.
 *
 * Reading cookies() here makes any [slug] route dynamic (opts out of the
 * full route cache) — an accepted trade-off (plan D5): the underlying data
 * reads stay behind unstable_cache, so DB load is unchanged.
 *
 * Confirmed again via a real generateStaticParams + build attempt (see the
 * comment above generateMetadata in src/app/[slug]/layout.tsx) — this is
 * the reason ISR/static generation doesn't apply to [slug]/*, not a build
 * misconfiguration.
 */
export const getSiteTheme = cache(
  async (restaurant: Pick<Restaurant, "id">): Promise<{ theme: ResolvedTheme; preview: boolean }> => {
    const cookieStore = await cookies();
    const previewId = cookieStore.get(PREVIEW_COOKIE)?.value;

    if (previewId === restaurant.id) {
      const admin = await getAdminContext();
      if (admin) {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("restaurant_theme")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .maybeSingle();
        const theme = data
          ? mergeDraft(data as RestaurantTheme)
          : resolveTheme(null, restaurant.id);
        return { theme, preview: true };
      }
    }

    const theme = await getPublicTheme(restaurant.id);
    return { theme, preview: false };
  },
);
