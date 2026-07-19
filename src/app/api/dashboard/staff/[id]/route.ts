import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertFeature, requireOwner } from "@/lib/dashboard";
import { logAdminAction } from "@/lib/audit";
import { staffPatchSchema } from "@/lib/schemas";

// Service role bypasses RLS entirely — every handler below re-verifies the
// target belongs to THIS restaurant and isn't an owner before touching it,
// so an owner can't be tricked into editing/deleting another tenant's
// account, another owner, or (for deactivation) themselves.
async function loadTeamMember(id: string, restaurantId: string) {
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, restaurant_id, role")
    .eq("id", id)
    .maybeSingle();

  if (!target || target.restaurant_id !== restaurantId || target.role === "owner") {
    return null;
  }
  return target;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "staff_management");
  if (featureError) return featureError;

  const parsed = staffPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  if (id === guard.ctx.profile.id && parsed.data.active === false) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas vous désactiver vous-même" },
      { status: 400 },
    );
  }

  const target = await loadTeamMember(id, guard.ctx.restaurant.id);
  if (!target) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(parsed.data).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }

  await logAdminAction(guard.ctx.profile.id, "staff.update", guard.ctx.restaurant.id, {
    targetId: id,
    changes: parsed.data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "staff_management");
  if (featureError) return featureError;

  if (id === guard.ctx.profile.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas vous retirer vous-même" },
      { status: 400 },
    );
  }

  const target = await loadTeamMember(id, guard.ctx.restaurant.id);
  if (!target) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }

  await logAdminAction(guard.ctx.profile.id, "staff.remove", guard.ctx.restaurant.id, {
    targetId: id,
    targetRole: target.role,
  });

  return NextResponse.json({ ok: true });
}
