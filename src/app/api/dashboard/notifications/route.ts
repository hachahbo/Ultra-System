import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/dashboard";
import type { Role } from "@/lib/permissions";
import type { OrderStatus } from "@/lib/order-flow";

// ---------------------------------------------------------------------------
// GET — notification feed for the dashboard header bell.
//
// Role-scoped (order-workflow-Plan.md §3): before v30 every role received the
// same undifferentiated list, so a chef was told about reservations and a
// waiter was never told when food came up. Each role now gets only the events
// it can act on. RLS still scopes every row to the caller's own restaurant, so
// requireSession() remains the right guard.
// ---------------------------------------------------------------------------

export type NotificationItem = {
  id: string;
  kind: "order" | "order_ready" | "reservation" | "event_inquiry";
  title: string;
  subtitle: string;
  created_at: string;
  href: string;
};

// Which fulfilment states each role is notified about.
//   pending   → a waiter must approve it
//   preparing → it just landed on the kitchen display
//   ready     → the kitchen is done; a waiter must run it to the table
//   served    → closed, of interest only to the people watching the floor
const ORDER_FEED_STATUSES: Record<Role, OrderStatus[]> = {
  owner: ["pending", "served"],
  manager: ["pending", "served"],
  serveur: ["pending", "ready"],
  cuisine: ["preparing"],
};

// Reservations are only actionable by roles that can open the page
// (permissions.ts ROUTE_ACCESS) — the kitchen has no use for them.
const RESERVATION_ROLES: Role[] = ["owner", "manager", "serveur"];

export async function GET() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const role = guard.ctx.profile.role;
  const supabase = await createClient();

  const wantsReservations = RESERVATION_ROLES.includes(role);

  const [ordersRes, reservationsRes, inquiriesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, customer_name, table_number, type, total, status, created_at")
      .in("status", ORDER_FEED_STATUSES[role])
      .order("created_at", { ascending: false })
      .limit(15),
    wantsReservations
      ? supabase
          .from("reservations")
          .select("id, customer_name, party_size, date, time, created_at")
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [], error: null }),
    // event_inquiries is owner+manager-only by RLS — a staff session simply
    // gets an empty set here rather than an error.
    supabase
      .from("event_inquiries")
      .select("id, full_name, guest_count, preferred_date, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  if (ordersRes.error || reservationsRes.error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }

  const orderItems: NotificationItem[] = (ordersRes.data ?? []).map((o) => {
    const code = "CMD-" + o.id.slice(0, 4).toUpperCase();
    const place =
      o.type === "dine_in"
        ? `Sur place${o.table_number ? ` · Table ${o.table_number}` : ""}`
        : "Livraison";
    const amount = `${Number(o.total).toFixed(0)} MAD`;

    // The one alert this whole workflow exists to deliver: the kitchen is
    // done and the food is going cold until a waiter picks it up. It gets its
    // own kind so the header can style and sound it apart from a new order.
    if (o.status === "ready") {
      return {
        id: o.id,
        kind: "order_ready" as const,
        title: `${code} prête à servir`,
        subtitle: `${place} · ${amount}`,
        created_at: o.created_at,
        href: "/dashboard/service",
      };
    }

    const title =
      o.status === "pending"
        ? `Nouvelle commande ${code}`
        : o.status === "preparing"
          ? `Nouveau bon ${code}`
          : `Commande ${code} servie`;

    return {
      id: o.id,
      kind: "order" as const,
      title,
      subtitle: `${place} · ${amount}`,
      created_at: o.created_at,
      // A pending order is actioned in the service queue; a served one is
      // just a record, so it goes to the back-office grid.
      href:
        o.status === "preparing"
          ? "/dashboard/kds"
          : o.status === "pending"
            ? "/dashboard/service"
            : "/dashboard/orders",
    };
  });

  const reservationItems: NotificationItem[] = (reservationsRes.data ?? []).map((r) => ({
    id: r.id,
    kind: "reservation",
    title: "Nouvelle réservation",
    subtitle: `${r.customer_name} · ${r.party_size} pers. le ${r.date} à ${r.time.slice(0, 5)}`,
    created_at: r.created_at,
    href: "/dashboard/reservations",
  }));

  const inquiryItems: NotificationItem[] = (inquiriesRes.data ?? []).map((q) => ({
    id: q.id,
    kind: "event_inquiry",
    title: "Nouvelle demande privée",
    subtitle: `${q.full_name} · ${q.guest_count} pers.${q.preferred_date ? ` · ${q.preferred_date}` : ""}`,
    created_at: q.created_at,
    href: "/dashboard/events",
  }));

  const items = [...orderItems, ...reservationItems, ...inquiryItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return NextResponse.json({ items });
}
