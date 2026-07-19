import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/dashboard";

// POST /api/dashboard/shifts/clock-in — any role. RLS ("shifts self clock
// in") only lets a caller insert a row for themselves; the DB's partial
// unique index (one open shift per profile) is the real guard against
// double clock-ins, this just turns that into a friendly error.
export async function POST() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .insert({ restaurant_id: guard.ctx.restaurant.id, profile_id: guard.ctx.profile.id })
    .select("id, clock_in")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Vous êtes déjà pointé(e)" }, { status: 409 });
    }
    return NextResponse.json({ error: "Pointage impossible" }, { status: 500 });
  }
  return NextResponse.json({ shift: data }, { status: 201 });
}
