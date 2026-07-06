import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Fetches past + future so the day filter (Aujourd'hui/À venir/Passées)
  // has something to show for "Passées" too — pilot scale, no date bound.
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*")
    .order("date")
    .order("time")
    .limit(500);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
  return NextResponse.json({ reservations });
}
