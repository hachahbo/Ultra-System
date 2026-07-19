import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";

// PATCH /api/dashboard/kds/[id] — bump (mark done) a ticket
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["owner", "manager", "serveur", "cuisine"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "kds");
  if (featureError) return featureError;

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kds_tickets")
    .update({ status: "bumped", bumped_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status, bumped_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

  return NextResponse.json({ ticket: data });
}
