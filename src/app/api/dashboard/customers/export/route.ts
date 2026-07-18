import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string) {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// One-click CSV export of the customer list (plan.md §3E). RLS ("customers
// owner read", 0008_team_roles.sql) restricts the select to owner/manager of
// the caller's own restaurant — serveur/cuisine get zero rows.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Non autorisé", { status: 401 });
  }

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
