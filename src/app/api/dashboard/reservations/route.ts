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

  const today = new Date().toISOString().slice(0, 10);
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*")
    .gte("date", today)
    .order("date")
    .order("time")
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
  return NextResponse.json({ reservations });
}
