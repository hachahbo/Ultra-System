import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ password: z.string().min(8, "8 caractères minimum") });

// Deliberately does NOT use requireSession()/requireOwner() — those block
// while must_change_password is set, and this is the one route that has to
// work anyway to clear it.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mot de passe trop court" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: pwError } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.password,
  });
  if (pwError) {
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id)
    .select("role")
    .single();

  return NextResponse.json({ ok: true, role: profile?.role ?? null });
}
