import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertFeature, requireOwner } from "@/lib/dashboard";
import { logAdminAction } from "@/lib/audit";
import { staffSchema } from "@/lib/schemas";

export async function GET() {
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "staff_management");
  if (featureError) return featureError;

  const supabase = await createClient();
  // "profiles owner read tenant" RLS policy (0002 migration) allows this.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, role, active, created_at, consented_at")
    .eq("restaurant_id", guard.ctx.restaurant.id)
    .neq("role", "owner");

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }

  const admin = createAdminClient();
  const staff = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      return {
        id: p.id,
        email: data.user?.email ?? "—",
        role: p.role,
        active: p.active ?? true,
        created_at: p.created_at,
        consented_at: p.consented_at,
      };
    }),
  );

  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "staff_management");
  if (featureError) return featureError;

  const parsed = staffSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message =
      parsed.error.issues.find((i) => i.path[0] === "consent")?.message ??
      "Données invalides";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Création impossible" },
      { status: 400 },
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    restaurant_id: guard.ctx.restaurant.id,
    role: parsed.data.role,
    active: true,
    must_change_password: true,
    consented_at: new Date().toISOString(),
  });
  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned login.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }

  await logAdminAction(guard.ctx.profile.id, "staff.invite", guard.ctx.restaurant.id, {
    targetId: created.user.id,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  return NextResponse.json({ id: created.user.id }, { status: 201 });
}
