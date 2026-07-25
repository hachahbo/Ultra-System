import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/dashboard";

// ---------------------------------------------------------------------------
// GET — notification feed for the dashboard header bell. Merges the most
// recent orders with pending (status='new') reservations into one time-sorted
// list. All 4 roles can read (same access as the orders/reservations feeds),
// so requireSession() — the RLS "tenant read" policies scope every row to the
// caller's own restaurant.
// ---------------------------------------------------------------------------

export type NotificationItem = {
  id: string;
  kind: "order" | "reservation" | "event_inquiry";
  title: string;
  subtitle: string;
  created_at: string;
  href: string;
};

export async function GET() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const supabase = await createClient();

  const [ordersRes, reservationsRes, inquiriesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, customer_name, table_number, type, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("reservations")
      .select("id, customer_name, party_size, date, time, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(15),
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
    return {
      id: o.id,
      kind: "order",
      title: `Nouvelle commande ${code}`,
      subtitle: `${place} · ${Number(o.total).toFixed(0)} MAD`,
      created_at: o.created_at,
      href: "/dashboard/orders",
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
