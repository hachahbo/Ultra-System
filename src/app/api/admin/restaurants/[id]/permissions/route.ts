import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { permissionToggleSchema } from "@/lib/schemas";
import { resolveFeaturesWithSource } from "@/lib/features";
import type { Restaurant, RestaurantFeature } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const admin = createAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("plan")
    .eq("id", id)
    .maybeSingle();
  if (!restaurant) {
    return apiError("not_found", "Restaurant introuvable", 404);
  }
  const { data: features } = await admin
    .from("restaurant_features")
    .select("*")
    .eq("restaurant_id", id);

  return NextResponse.json({
    features: resolveFeaturesWithSource(
      (restaurant as Pick<Restaurant, "plan">).plan,
      (features ?? []) as RestaurantFeature[],
    ),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const url = new URL(request.url);
  const body = await request.json().catch(() => null);

  const admin = createAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, plan")
    .eq("id", id)
    .maybeSingle();
  if (!restaurant) {
    return apiError("not_found", "Restaurant introuvable", 404);
  }

  // ?reset=<featureKey> deletes the override, falling back to the plan default.
  const reset = url.searchParams.get("reset");
  if (reset) {
    const { error } = await admin
      .from("restaurant_features")
      .delete()
      .eq("restaurant_id", id)
      .eq("feature_key", reset);
    if (error) {
      return apiError("update_failed", "Réinitialisation impossible", 500);
    }
    await logAdminAction(guard.ctx.adminId, "permission.reset", id, { featureKey: reset });
    // online_ordering/reservations gate the public site — keep it in sync.
    revalidateTag("menu", "max");
    return NextResponse.json({ ok: true });
  }

  const parsed = permissionToggleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", "Données invalides", 400);
  }

  const { error } = await admin.from("restaurant_features").upsert(
    {
      restaurant_id: id,
      feature_key: parsed.data.featureKey,
      enabled: parsed.data.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "restaurant_id,feature_key" },
  );
  if (error) {
    return apiError("update_failed", "Mise à jour impossible", 500);
  }
  await logAdminAction(guard.ctx.adminId, "permission.toggle", id, {
    featureKey: parsed.data.featureKey,
    enabled: parsed.data.enabled,
  });
  revalidateTag("menu", "max");

  return NextResponse.json({ ok: true });
}
