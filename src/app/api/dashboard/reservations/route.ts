import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";

export async function GET() {
  const guard = await requireRole(["owner", "manager", "serveur"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "reservations");
  if (featureError) return featureError;

  const supabase = await createClient();
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
