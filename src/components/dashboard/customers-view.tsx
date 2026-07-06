"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { Customer, Order } from "@/lib/types";

async function fetchCustomerOrders(
  id: string,
): Promise<{ orders: Order[]; total_spent: number }> {
  const res = await fetch(`/api/dashboard/customers/${id}/orders`);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

export function CustomersView({ customers }: { customers: Customer[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  // Client-side filter — fine at pilot scale.
  // TODO(scale): server-side search (api/dashboard/customers?q=) at >2000 rows.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [customers, query]);

  return (
    <div>
      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un client…"
          className="pl-9"
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {filtered.length} client{filtered.length > 1 ? "s" : ""}
      </p>

      {customers.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-muted-foreground">
          <Users className="size-10" />
          <p className="mt-3 text-sm">
            Vos clients apparaîtront ici dès la première commande en livraison.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-border">
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
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(c)}
                >
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <a
                      href={`tel:${c.phone}`}
                      onClick={(e) => e.stopPropagation()}
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

      <CustomerHistoryDialog customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function CustomerHistoryDialog({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const { data, isPending } = useQuery({
    queryKey: ["customer-orders", customer?.id],
    queryFn: () => fetchCustomerOrders(customer!.id),
    enabled: customer !== null,
  });

  return (
    <Dialog open={customer !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{customer?.name}</DialogTitle>
        </DialogHeader>
        {customer && (
          <>
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total dépensé</span>
              <span className="font-semibold">
                {isPending ? "…" : formatPrice(data?.total_spent ?? 0)}
              </span>
            </div>
            <div className="space-y-2">
              {isPending && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Chargement…
                </p>
              )}
              {!isPending && (data?.orders.length ?? 0) === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucune commande.
                </p>
              )}
              {data?.orders.map((o) => (
                <div key={o.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {formatDateTime(o.created_at)}
                    </span>
                    <span className="font-semibold">{formatPrice(o.total)}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {o.items.map((l) => `${l.quantity}× ${l.name}`).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
