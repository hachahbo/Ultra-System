import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/dashboard";

// POST /api/dashboard/shifts/clock-out — closes the caller's own open
// shift. RLS ("shifts self update") scopes the update to the caller.
export async function POST() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .update({ clock_out: new Date().toISOString() })
    .eq("profile_id", guard.ctx.profile.id)
    .is("clock_out", null)
    .select("id, clock_in, clock_out")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Dépointage impossible" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Aucun service en cours" }, { status: 404 });

  return NextResponse.json({ shift: data });
}
