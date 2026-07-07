import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { bulkPermissionsSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const parsed = bulkPermissionsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("invalid_input", "Données invalides", 400);
  }
  const { restaurantIds, changes } = parsed.data;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const rows = restaurantIds.flatMap((restaurantId) =>
    changes.map((c) => ({
      restaurant_id: restaurantId,
      feature_key: c.featureKey,
      enabled: c.enabled,
      updated_at: now,
    })),
  );

  const { error } = await admin
    .from("restaurant_features")
    .upsert(rows, { onConflict: "restaurant_id,feature_key" });

  const succeeded = !error;
  await logAdminAction(guard.ctx.adminId, "permissions.bulk", null, {
    restaurantIds,
    changes,
    succeeded,
    error: error?.message,
  });

  if (error) {
    return apiError("update_failed", "Mise à jour groupée impossible", 500);
  }
  revalidateTag("menu", "max");
  return NextResponse.json({ ok: true, updated: rows.length });
}
