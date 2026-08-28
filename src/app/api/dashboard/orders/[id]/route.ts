import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/dashboard";
import { canTransition, normalizeOrderStatus, ORDER_STATUSES } from "@/lib/order-flow";

const patchSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  customer_name: z.string().nullable().optional(),
  table_number: z.string().nullable().optional(),
  type: z.enum(["dine_in", "delivery"]).optional(),
  note: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});

// Postgres check_violation. Raised by enforce_order_transition() (0030) when a
// status change loses a race — two waiters approving the same ticket — and by
// the orders_status_check / orders_served_at_required constraints.
const CHECK_VIOLATION = "23514";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Was requireSession(): any authenticated staff member could write any
  // status over any other, including skipping waiter approval entirely. The
  // role gate is here; the *transition* gate is canTransition() below.
  const guard = await requireRole(["owner", "manager", "serveur", "cuisine"]);
  if ("response" in guard) return guard.response;

  const supabase = await createClient();

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // Read before write: the transition guard needs the order's current state,
  // and this separates "not found" from "conflict" before attempting a write.
  const { data: current, error: readError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error(`PATCH /api/dashboard/orders/${id} read error:`, readError);
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const role = guard.ctx.profile.role;
  const nextStatus = parsed.data.status;
  // The row can still carry a pre-0030 status ('new'/'done') on a database the
  // migration has not reached yet. fetchOrders (service-view.tsx) already
  // normalises on the way in, so the board renders an Approve button that the
  // raw value would then reject with a 403 the waiter cannot act on — the
  // client and the server disagreeing about what state the order is in.
  // order-flow.ts asks for this on every status crossing the API boundary;
  // this was the one place still casting instead.
  const currentStatus = normalizeOrderStatus(current.status);
  const isStatusChange = nextStatus !== undefined && nextStatus !== currentStatus;

  if (isStatusChange) {
    if (!canTransition(role, currentStatus, nextStatus)) {
      return NextResponse.json(
        {
          error: `Transition non autorisée pour ce rôle (${currentStatus} → ${nextStatus})`,
          order: current,
        },
        { status: 403 },
      );
    }

    // ORDER_TRANSITIONS is pure and feature-blind, so this last rule lives
    // here, where the SessionContext is. With a live KDS 'ready' is derived
    // from station bumps (sync_order_ready_from_tickets, 0030 §6) and a waiter
    // writing it directly would pre-empt stations that are still cooking.
    // service-view.tsx hides the button, but a hidden button is not a
    // boundary. owner/manager keep the manual override for a stuck ticket.
    if (
      guard.ctx.features.kds &&
      role === "serveur" &&
      currentStatus === "preparing" &&
      nextStatus === "ready"
    ) {
      return NextResponse.json(
        {
          error: "La cuisine valide les plats prêts depuis le KDS",
          order: current,
        },
        { status: 403 },
      );
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.customer_name !== undefined) updates.customer_name = parsed.data.customer_name;
  if (parsed.data.table_number !== undefined) updates.table_number = parsed.data.table_number;
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;

  // Who moved it. The matching _at columns are stamped by the database
  // (0030 §3) so they cannot be forgotten; only the actor has to come from
  // the session, since a trigger sees auth.uid() but not the profile row.
  if (isStatusChange && nextStatus === "confirmed") {
    updates.confirmed_by = guard.ctx.profile.id;
  }
  if (isStatusChange && nextStatus === "served") {
    updates.served_by = guard.ctx.profile.id;
  }

  let query = supabase.from("orders").update(updates).eq("id", id);
  if (parsed.data.updated_at) {
    query = query.eq("updated_at", parsed.data.updated_at);
  }

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    if (error.code === CHECK_VIOLATION) {
      const { data: fresh } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      // 23514 has two very different causes here and they were being conflated.
      // enforce_order_transition raises it with errcode = 'check_violation'
      // when someone else advanced the order under us — that IS a conflict.
      // But orders_status_check raises the same code when the status simply
      // is not one the table allows, which is a bug on our side (a schema
      // drifted from the code), and reporting it as "already updated" sends
      // the client into a retry loop against an error that will never clear.
      // The row having moved is what tells the two apart.
      if (fresh && fresh.status !== current.status) {
        return NextResponse.json(
          { error: "Commande déjà mise à jour", order: fresh },
          { status: 409 },
        );
      }
      console.error(
        `PATCH /api/dashboard/orders/${id} rejected status ${current.status} → ${nextStatus}:`,
        error,
      );
      return NextResponse.json(
        { error: `Transition refusée : ${error.message}`, order: fresh },
        { status: 422 },
      );
    }
    console.error(`PATCH /api/dashboard/orders/${id} db update error:`, error);
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }

  if (!data) {
    // The optimistic-concurrency predicate matched nothing.
    const { data: fresh } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!fresh) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Commande déjà mise à jour", order: fresh },
      { status: 409 },
    );
  }

  // Approving fans the order out to the KDS and advances it to 'preparing' in
  // an AFTER UPDATE trigger (0030 §4) — which runs after RETURNING has already
  // snapshotted the row. `data` therefore still says 'confirmed'. Re-read so
  // the client is handed the row the database actually holds.
  if (isStatusChange && nextStatus === "confirmed") {
    const { data: advanced } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (advanced) return NextResponse.json({ order: advanced });
  }

  return NextResponse.json({ order: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Tightened from requireSession(): hard-deleting an order is destructive and
  // irreversible, and the UI already only offers it to owner/manager. Leaving
  // the endpoint open to serveur/cuisine while carefully gating every status
  // transition would be a hole in the same wall.
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;

  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
