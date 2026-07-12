import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("restaurant_id", id)
    .eq("role", "owner")
    .maybeSingle();
  if (!owner) {
    return apiError("not_found", "Propriétaire introuvable", 404);
  }

  const tempPassword = crypto.randomUUID().slice(0, 12);
  const { error: updateError } = await admin.auth.admin.updateUserById(owner.id, {
    password: tempPassword,
  });
  if (updateError) {
    return apiError("update_failed", "Réinitialisation impossible", 500);
  }

  await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", owner.id);

  await logAdminAction(guard.ctx.adminId, "owner.reset_password", id, {});

  return NextResponse.json({ tempPassword });
}
