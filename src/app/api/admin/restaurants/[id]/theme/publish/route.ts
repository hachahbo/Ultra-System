import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";
import { themeDraftSchema, themePublishSchema } from "@/lib/schemas";
import type { RestaurantTheme } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const parsed = themePublishSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "Données invalides", 400);
  const { expected_updated_at } = parsed.data;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("restaurant_theme")
    .select("*")
    .eq("restaurant_id", id)
    .maybeSingle();
  if (!row) return apiError("not_found", "Thème introuvable", 404);
  if (row.updated_at !== expected_updated_at) {
    return apiError("conflict", "Ce thème a été modifié entre-temps", 409);
  }
  if (!row.draft) return apiError("no_draft", "Aucun brouillon à publier", 400);

  // Re-validate the draft against the current schema before copying it into
  // the live columns — guards against a shape that was valid when saved but
  // has since drifted (e.g. a removed font pair key).
  const draftParsed = themeDraftSchema.safeParse(row.draft);
  if (!draftParsed.success) {
    return apiError("invalid_draft", "Le brouillon contient des données invalides", 400);
  }

  const theme = row as RestaurantTheme;
  const publishedFields = Object.keys(draftParsed.data);
  const now = new Date().toISOString();
  // Spread (not `??`): a draft field explicitly set to `null` — e.g. "reset
  // this color to the platform default" — must win over the live value, and
  // `??` would incorrectly fall through past an explicit null.
  const merged = {
    color_primary: theme.color_primary,
    color_secondary: theme.color_secondary,
    color_background: theme.color_background,
    color_text: theme.color_text,
    font_pair: theme.font_pair,
    logo_url: theme.logo_url,
    hero_image_urls: theme.hero_image_urls,
    about_title: theme.about_title,
    about_body: theme.about_body,
    address: theme.address,
    sections: theme.sections,
    custom_copy: theme.custom_copy,
    ...draftParsed.data,
  };
  const { data: updated, error } = await admin
    .from("restaurant_theme")
    .update({ ...merged, draft: null, updated_at: now })
    .eq("restaurant_id", id)
    .eq("updated_at", expected_updated_at)
    .select("updated_at")
    .maybeSingle();

  if (error || !updated) {
    return apiError("conflict", "Ce thème a été modifié entre-temps", 409);
  }

  await logAdminAction(guard.ctx.adminId, "site.publish", id, { fields: publishedFields });
  revalidateTag("menu", "max");

  return NextResponse.json({ updated_at: updated.updated_at });
}
