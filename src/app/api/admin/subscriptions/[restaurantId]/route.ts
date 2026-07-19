import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionPatchSchema } from "@/lib/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  const { restaurantId } = await params;

  const parsed = subscriptionPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return apiError("invalid_input", "Données invalides", 400);
  }

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("subscriptions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!before) {
    return apiError("not_found", "Abonnement introuvable", 404);
  }

  // canceled_at (0010_churn_and_integrity.sql) is the source of truth for
  // churn/acquisition math — set it the moment status transitions TO
  // canceled, clear it if the subscription is ever reactivated. Never
  // derived from updated_at, which any unrelated edit (e.g. a notes change)
  // would otherwise bump.
  const statusChange: { canceled_at?: string | null } = {};
  if (parsed.data.status && parsed.data.status !== before.status) {
    statusChange.canceled_at = parsed.data.status === "canceled" ? new Date().toISOString() : null;
  }

  const { data: updated, error } = await admin
    .from("subscriptions")
    .update({ ...parsed.data, ...statusChange, updated_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId)
    .select("*")
    .maybeSingle();
  if (error || !updated) {
    return apiError("update_failed", "Mise à jour impossible", 500);
  }

  // plan_tier changes here should stay in sync with restaurants.plan too,
  // same as the reverse direction in api/admin/restaurants/[id].
  if (parsed.data.plan_tier && parsed.data.plan_tier !== before.plan_tier) {
    await admin
      .from("restaurants")
      .update({ plan: parsed.data.plan_tier, updated_at: new Date().toISOString() })
      .eq("id", restaurantId);
  }

  await logAdminAction(guard.ctx.adminId, "subscription.update", restaurantId, {
    before,
    changes: parsed.data,
  });

  revalidateTag("admin-analytics", "max");
  return NextResponse.json({ subscription: updated });
}
