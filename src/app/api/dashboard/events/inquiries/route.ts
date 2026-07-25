import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";

// Private-hire inquiries feed. RLS "event_inquiries tenant read" limits this
// to owner + manager within the restaurant.
export async function GET() {
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "events");
  if (featureError) return featureError;

  const supabase = await createClient();
  const { data: inquiries, error } = await supabase
    .from("event_inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
  return NextResponse.json({ inquiries });
}
