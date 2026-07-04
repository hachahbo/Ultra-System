import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import type { Customer } from "@/lib/types";

export const metadata: Metadata = { title: "Clients" };

// The payoff (plan.md §3E): the exportable list the restaurant owns.
export default async function CustomersPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profile.role !== "owner") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .order("last_order", { ascending: false, nullsFirst: false });
  const customers = (data ?? []) as Customer[];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customers.length} client{customers.length > 1 ? "s" : ""} — cette
            liste vous appartient.
          </p>
        </div>
        <Button asChild>
          <a href="/api/dashboard/customers/export" download>
            <Download className="size-4" /> Exporter CSV
          </a>
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-muted-foreground">
          <Users className="size-10" />
          <p className="mt-3 text-sm">
            Vos clients apparaîtront ici dès la première commande en livraison.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="text-right">Commandes</TableHead>
                <TableHead className="text-right">Dernière commande</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <a
                      href={`tel:${c.phone}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {c.phone}
                    </a>
                  </TableCell>
                  <TableCell className="text-right">{c.order_count}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {c.last_order ? formatDateTime(c.last_order) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
