import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/dashboard";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;

  const admin = createAdminClient();
  // Service role bypasses RLS entirely — verify the target is staff of THIS
  // restaurant before deleting, so an owner can't be tricked into deleting
  // another tenant's account (or another owner, or themselves).
  const { data: target } = await admin
    .from("profiles")
    .select("id, restaurant_id, role")
    .eq("id", id)
    .maybeSingle();

  if (
    !target ||
    target.restaurant_id !== guard.ctx.restaurant.id ||
    target.role !== "staff"
  ) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
