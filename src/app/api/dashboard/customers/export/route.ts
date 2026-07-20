import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/dashboard";

function csvEscape(value: string) {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// One-click CSV export of the customer list (plan.md §3E). RLS ("customers
// owner read", 0001_init.sql) restricts the select to the owner of the
// caller's own restaurant — matched here with requireRole(["owner"]) rather
// than a bare auth check, so a manager gets an honest 403 instead of a
// silently-empty CSV (RLS would just return zero rows for them).
export async function GET() {
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;

  const supabase = await createClient();
  const { data: customers, error } = await supabase
    .from("customers")
    .select("name, phone, order_count, first_seen, last_order")
    .order("last_order", { ascending: false, nullsFirst: false });

  if (error) {
    return new Response("Erreur de lecture", { status: 500 });
  }

  const header = "nom,telephone,commandes,premiere_visite,derniere_commande";
  const rows = (customers ?? []).map((c) =>
    [
      csvEscape(c.name ?? ""),
      csvEscape(c.phone ?? ""),
      String(c.order_count ?? 0),
      c.first_seen?.slice(0, 10) ?? "",
      c.last_order?.slice(0, 10) ?? "",
    ].join(","),
  );
  const csv = "﻿" + [header, ...rows].join("\n"); // BOM so Excel opens UTF-8

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
