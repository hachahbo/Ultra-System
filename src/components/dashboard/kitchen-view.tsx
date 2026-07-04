"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Check, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";

async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/dashboard/orders");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).orders;
}

export function KitchenView() {
  const queryClient = useQueryClient();
  const { data: orders, isPending } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    refetchInterval: 10_000, // live kitchen view — poll every 10s
  });

  // "New order" signal: toast when an unseen order id appears.
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!orders) return;
    if (seenIds.current === null) {
      seenIds.current = new Set(orders.map((o) => o.id));
      return;
    }
    for (const order of orders) {
      if (!seenIds.current.has(order.id)) {
        seenIds.current.add(order.id);
        toast.success(
          order.type === "dine_in"
            ? `Nouvelle commande — table ${order.table_number}`
            : `Nouvelle commande livraison — ${order.customer_name ?? ""}`,
        );
      }
    }
  }, [orders]);

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
    onError: () => toast.error("Impossible de mettre à jour la commande"),
  });

  const newOrders = (orders ?? []).filter((o) => o.status === "new");
  const doneOrders = (orders ?? []).filter((o) => o.status === "done");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Commandes</h1>
      <Tabs defaultValue="new" className="mt-4">
        <TabsList>
          <TabsTrigger value="new">
            En cours{newOrders.length > 0 && ` (${newOrders.length})`}
          </TabsTrigger>
          <TabsTrigger value="done">Terminées</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-4 space-y-3">
          {isPending && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Chargement…
            </p>
          )}
          {!isPending && newOrders.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Aucune commande en cours. Les nouvelles commandes apparaissent
              automatiquement.
            </p>
          )}
          {newOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onDone={() => markDone.mutate(order.id)}
              marking={markDone.isPending}
            />
          ))}
        </TabsContent>
        <TabsContent value="done" className="mt-4 space-y-3">
          {doneOrders.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Aucune commande terminée.
            </p>
          )}
          {doneOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderCard({
  order,
  onDone,
  marking,
}: {
  order: Order;
  onDone?: () => void;
  marking?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {order.type === "dine_in" ? (
              <Badge variant="secondary">
                <UtensilsCrossed className="size-3.5" /> Table{" "}
                {order.table_number}
              </Badge>
            ) : (
              <Badge>
                <Bike className="size-3.5" /> Livraison
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDateTime(order.created_at)}
            </span>
          </div>
          <span className="font-semibold">{formatPrice(order.total)}</span>
        </div>

        <ul className="mt-3 space-y-1 text-sm">
          {order.items.map((line, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>
                <span className="font-medium">{line.quantity}×</span>{" "}
                {line.name}
                {line.options.length > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {line.options.join(", ")}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {formatPrice(line.unit_price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {order.type === "delivery" && (
          <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
            <p className="font-medium">{order.customer_name}</p>
            {order.address && (
              <p className="text-muted-foreground">{order.address}</p>
            )}
          </div>
        )}
        {order.note && (
          <p className="mt-2 text-sm italic text-muted-foreground">
            « {order.note} »
          </p>
        )}

        {onDone && (
          <Button
            className="mt-4 w-full"
            variant="secondary"
            disabled={marking}
            onClick={onDone}
          >
            <Check className="size-4" /> Marquer terminée
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
