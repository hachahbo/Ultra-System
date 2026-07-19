import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/dashboard";

// GET /api/dashboard/shifts/active — the caller's own currently-open shift,
// if any. Every role can call this (the sidebar clock widget is visible to
// everyone) — RLS ("shifts self or manager read") already scopes it to
// the caller regardless of role.
export async function GET() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("id, clock_in")
    .eq("profile_id", guard.ctx.profile.id)
    .is("clock_out", null)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  return NextResponse.json({ shift: data ?? null });
}
