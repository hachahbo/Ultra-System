import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { themePatchSchema } from "@/lib/schemas";
import type { RestaurantTheme } from "@/lib/types";

const THEME_COLUMNS =
  "restaurant_id, color_primary, color_secondary, color_background, color_text, font_pair, logo_url, hero_image_urls, about_title, about_body, address, sections, custom_copy, welcome_gallery_urls, values_items, testimonials, about_gallery_urls, about_rating, about_review_count, about_map_url, specials_image_url, social_facebook_url, social_instagram_url, social_twitter_url, draft, updated_at";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const admin = createAdminClient();
  const { data: restaurant } = await admin.from("restaurants").select("id").eq("id", id).maybeSingle();
  if (!restaurant) return apiError("not_found", "Restaurant introuvable", 404);

  let { data: theme } = await admin
    .from("restaurant_theme")
    .select(THEME_COLUMNS)
    .eq("restaurant_id", id)
    .maybeSingle();

  // Defensive: every restaurant gets a theme row at creation time
  // (api/admin/restaurants POST), but lazily create one if it's ever missing.
  if (!theme) {
    const { data: created, error } = await admin
      .from("restaurant_theme")
      .insert({ restaurant_id: id })
      .select(THEME_COLUMNS)
      .single();
    if (error || !created) return apiError("create_failed", "Création du thème impossible", 500);
    theme = created;
  }

  return NextResponse.json({ theme: theme as RestaurantTheme });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const parsed = themePatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "Données invalides", 400);
  const { draft, expected_updated_at } = parsed.data;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("restaurant_theme")
    .update({ draft, updated_at: now })
    .eq("restaurant_id", id)
    .eq("updated_at", expected_updated_at)
    .select("updated_at")
    .maybeSingle();

  if (error) return apiError("update_failed", "Mise à jour impossible", 500);
  if (!data) {
    const { data: current } = await admin
      .from("restaurant_theme")
      .select("updated_at")
      .eq("restaurant_id", id)
      .maybeSingle();
    if (!current) return apiError("not_found", "Thème introuvable", 404);
    return apiError("conflict", "Ce thème a été modifié entre-temps", 409);
  }

  return NextResponse.json({ updated_at: data.updated_at });
}
