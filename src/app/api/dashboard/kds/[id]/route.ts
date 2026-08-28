import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";

// PATCH /api/dashboard/kds/[id] — bump (mark done) a ticket
//
// `serveur` is deliberately absent. A bump is the kitchen's assertion that its
// station has plated, and sync_order_ready_from_tickets() (0030 §6) derives the
// order's 'ready' status from those bumps. Letting a waiter bump forges that
// signal from outside the kitchen — the same hole the per-order "Ready" button
// opens, which 0030 §6 exists to close. Waiters keep GET: seeing the pass is
// useful, writing to it is not.
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["owner", "manager", "cuisine"]);
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
