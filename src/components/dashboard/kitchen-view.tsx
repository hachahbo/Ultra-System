"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bike,
  Check,
  ChefHat,
  LayoutGrid,
  List,
  UtensilsCrossed,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FloorPlanMap, type TableStatus } from "@/components/dashboard/floor-plan";
import { fetchTables, tablesQueryKey } from "@/lib/tables-query";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ensureAudioUnlocked, isAudioUnlocked, playNewOrderBeep } from "@/lib/sound";
import type { DiningTable, Order } from "@/lib/types";

const SOUND_KEY = "darna-sound";

async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/dashboard/orders");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).orders;
}

type Filter = "active" | "dine_in" | "delivery" | "all" | "done";

const filters: { value: Filter; label: string }[] = [
  { value: "active", label: "Actives" },
  { value: "dine_in", label: "Sur place" },
  { value: "delivery", label: "Livraison" },
  { value: "all", label: "Toutes" },
  { value: "done", label: "Terminées" },
];

const ACTIVE_STATUSES: Order["status"][] = ["new", "preparing"];

function matchesFilter(order: Order, filter: Filter): boolean {
  switch (filter) {
    case "active":
      return ACTIVE_STATUSES.includes(order.status);
    case "dine_in":
      return order.type === "dine_in";
    case "delivery":
      return order.type === "delivery";
    case "done":
      return order.status === "done";
    case "all":
    default:
      return true;
  }
}

export function KitchenView() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "map">("list");
  const [filter, setFilter] = useState<Filter>("active");
  const [soundOn, setSoundOn] = useState(false);
  const [mapTable, setMapTable] = useState<DiningTable | null>(null);

  const { data: orders, isPending } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    refetchInterval: 10_000, // live kitchen view — poll every 10s
  });
  const { data: tables } = useQuery({
    queryKey: tablesQueryKey,
    queryFn: fetchTables,
    enabled: view === "map",
  });

  useEffect(() => {
    setSoundOn(localStorage.getItem(SOUND_KEY) === "on");
  }, []);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    if (next) ensureAudioUnlocked();
  }

  // "New order" signal: toast + beep when an unseen order id appears.
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
        if (isAudioUnlocked()) playNewOrderBeep();
      }
    }
  }, [orders]);

  const advance = useMutation({
    mutationFn: async ({ order, status }: { order: Order; status: Order["status"] }) => {
      const res = await fetch(`/api/dashboard/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, updated_at: order.updated_at }),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => null);
        throw new ConcurrencyError(body?.order);
      }
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
    onError: (err) => {
      if (err instanceof ConcurrencyError) {
        toast.message("Commande déjà mise à jour — actualisation");
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        return;
      }
      toast.error("Impossible de mettre à jour la commande");
    },
  });

  const allOrders = orders ?? [];
  const activeDineInByTable = new Map<string, Order[]>();
  for (const o of allOrders) {
    if (o.type !== "dine_in" || !o.table_number || !ACTIVE_STATUSES.includes(o.status)) {
      continue;
    }
    const list = activeDineInByTable.get(o.table_number) ?? [];
    list.push(o);
    activeDineInByTable.set(o.table_number, list);
  }

  function tableStatus(table: DiningTable): TableStatus {
    return activeDineInByTable.has(table.number) ? "active" : "default";
  }
  function tablePulse(table: DiningTable): boolean {
    return (activeDineInByTable.get(table.number) ?? []).some((o) => o.status === "new");
  }
  function tableBadge(table: DiningTable) {
    const count = activeDineInByTable.get(table.number)?.length ?? 0;
    if (count === 0) return null;
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
        {count}
      </span>
    );
  }

  const filtered = allOrders.filter((o) => matchesFilter(o, filter));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Commandes</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={soundOn ? "Désactiver le son" : "Activer le son"}
            onClick={toggleSound}
          >
            {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Button>
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Vue liste"
              onClick={() => setView("list")}
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={view === "map" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Vue plan de salle"
              onClick={() => setView("map")}
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Les tables avec une commande en cours s&apos;allument. Touchez une
            table pour voir sa commande.
          </p>
          <FloorPlanMap
            tables={tables ?? []}
            mode="view"
            getStatus={tableStatus}
            pulse={tablePulse}
            badge={tableBadge}
            onTableTap={setMapTable}
          />
        </div>
      ) : (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mt-4">
          <TabsList className="flex-wrap">
            {filters.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={filter} className="mt-4 space-y-3">
            {isPending && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Chargement…
              </p>
            )}
            {!isPending && filtered.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Aucune commande ici pour le moment.
              </p>
            )}
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAdvance={(status) => advance.mutate({ order, status })}
                marking={advance.isPending}
              />
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Tapped table's active orders (map mode) */}
      <Sheet open={mapTable !== null} onOpenChange={(open) => !open && setMapTable(null)}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {mapTable ? `Table ${mapTable.number}` : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-6">
            {mapTable &&
              (activeDineInByTable.get(mapTable.number) ?? []).map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAdvance={(status) => advance.mutate({ order, status })}
                  marking={advance.isPending}
                />
              ))}
            {mapTable && (activeDineInByTable.get(mapTable.number) ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune commande en cours pour cette table.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

class ConcurrencyError extends Error {
  order?: Order;
  constructor(order?: Order) {
    super("concurrency conflict");
    this.order = order;
  }
}

function OrderCard({
  order,
  onAdvance,
  marking,
}: {
  order: Order;
  onAdvance?: (status: Order["status"]) => void;
  marking?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
            {order.status === "preparing" && (
              <Badge variant="outline">
                <ChefHat className="size-3.5" /> En préparation
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

        {onAdvance && order.status === "new" && (
          <Button
            className="mt-4 w-full"
            variant="secondary"
            disabled={marking}
            onClick={() => onAdvance("preparing")}
          >
            <ChefHat className="size-4" /> Commencer
          </Button>
        )}
        {onAdvance && order.status === "preparing" && (
          <Button
            className="mt-4 w-full"
            variant="secondary"
            disabled={marking}
            onClick={() => onAdvance("done")}
          >
            <Check className="size-4" /> Marquer terminée
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
