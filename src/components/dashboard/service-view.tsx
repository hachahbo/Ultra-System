"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  Ban,
  Check,
  ChefHat,
  ClipboardCheck,
  Clock,
  PackageX,
  RotateCcw,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { dateFnsLocale } from "@/lib/date-locale";
import {
  isNotificationSoundEnabled,
  playNotificationChime,
} from "@/lib/notification-sound";
import { formatPrice } from "@/lib/format";
import { isInKitchen, type OrderStatus } from "@/lib/order-flow";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
// Declared locally rather than imported from lib/types, matching kds-view.tsx:
// this view reads a narrow projection of `orders`, and Order's own status union
// is still the pre-0030 triple until Phase 4 rewires the back-office grid.

type ServiceLine = {
  item_id: string;
  name: string;
  quantity: number;
  options: string[];
};

type ServiceOrder = {
  id: string;
  type: "dine_in" | "delivery";
  table_number: string | null;
  customer_name: string | null;
  note: string | null;
  items: ServiceLine[];
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
};

// ── API ────────────────────────────────────────────────────────────────────

async function fetchOrders(): Promise<ServiceOrder[]> {
  const res = await fetch("/api/dashboard/orders");
  if (!res.ok) throw new Error("orders fetch failed");
  const { orders } = await res.json();
  return (orders ?? []) as ServiceOrder[];
}

/** item_id → in_stock, so the approval lane can flag a dish that is 86'd. */
async function fetchAvailability(): Promise<Record<string, boolean>> {
  const res = await fetch("/api/dashboard/menu");
  if (!res.ok) throw new Error("menu fetch failed");
  const { items } = await res.json();
  return Object.fromEntries(
    ((items ?? []) as { id: string; in_stock: boolean }[]).map((i) => [i.id, i.in_stock]),
  );
}

async function patchStatus(order: ServiceOrder, status: OrderStatus): Promise<void> {
  const res = await fetch(`/api/dashboard/orders/${order.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    // updated_at is the optimistic-concurrency token: if another waiter moved
    // this order since we rendered it, the API answers 409 instead of letting
    // us clobber their action.
    body: JSON.stringify({ status, updated_at: order.updated_at }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "status update failed");
  }
}

async function patchAvailability(itemId: string, inStock: boolean): Promise<void> {
  const res = await fetch(`/api/dashboard/items/${itemId}/availability`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ in_stock: inStock }),
  });
  if (!res.ok) throw new Error("availability update failed");
}

// ── Lanes ──────────────────────────────────────────────────────────────────

const LANES = [
  {
    key: "approve",
    label: "laneApprove",
    empty: "emptyApprove",
    icon: ClipboardCheck,
    match: (s: OrderStatus) => s === "pending",
    accent: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "kitchen",
    label: "laneKitchen",
    empty: "emptyKitchen",
    icon: ChefHat,
    match: isInKitchen,
    accent: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "ready",
    label: "laneReady",
    empty: "emptyReady",
    icon: UtensilsCrossed,
    match: (s: OrderStatus) => s === "ready",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
] as const;

type LaneKey = (typeof LANES)[number]["key"];

// ── Component ──────────────────────────────────────────────────────────────

export function ServiceView() {
  const locale = useLocale();
  const t = useTranslations("Service");
  const queryClient = useQueryClient();
  const [activeLane, setActiveLane] = useState<LaneKey>("approve");
  // Lazily initialised: Date.now() is impure, so it may not be called during
  // render itself. Owned here rather than in each card so one timer drives the
  // whole board's age colouring.
  const [now, setNow] = useState(() => Date.now());

  // Re-tick every 30s so the "waiting 4 min" ages stay honest without a poll.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    staleTime: 30_000,
  });

  const { data: availability } = useQuery({
    queryKey: ["menu-availability"],
    queryFn: fetchAvailability,
    staleTime: 60_000,
  });

  // Realtime: the whole point of this screen is that it moves on its own.
  // Mirrors the kds-view.tsx subscription pattern.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("service-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // The alert this whole workflow exists to deliver. A ref (not state) holds
  // the last-known ready set so this never re-renders on its own; the first
  // load seeds it silently, or every order already up would chime at once.
  const knownReady = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!orders) return;
    const readyIds = new Set(orders.filter((o) => o.status === "ready").map((o) => o.id));
    if (knownReady.current === null) {
      knownReady.current = readyIds;
      return;
    }
    const fresh = [...readyIds].filter((id) => !knownReady.current!.has(id));
    knownReady.current = readyIds;
    if (fresh.length > 0) {
      if (isNotificationSoundEnabled()) playNotificationChime();
      toast.success(t("readyAlert"), { duration: 6000 });
    }
  }, [orders, t]);

  const statusMutation = useMutation({
    mutationFn: ({ order, to }: { order: ServiceOrder; to: OrderStatus }) =>
      patchStatus(order, to),
    onMutate: async ({ order, to }) => {
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const prev = queryClient.getQueryData<ServiceOrder[]>(["orders"]);
      // Approving hands off to the kitchen: 0030's trigger advances the order
      // to 'preparing' in the same transaction, so that — not 'confirmed' — is
      // the state to show optimistically.
      const optimistic = to === "confirmed" ? "preparing" : to;
      queryClient.setQueryData<ServiceOrder[]>(["orders"], (old) =>
        (old ?? []).map((o) => (o.id === order.id ? { ...o, status: optimistic } : o)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["orders"], ctx.prev);
      toast.error(err instanceof Error ? err.message : t("approveFailed"));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ itemId, inStock }: { itemId: string; inStock: boolean }) =>
      patchAvailability(itemId, inStock),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu-availability"] }),
    onError: () => toast.error(t("availabilityFailed")),
  });

  const byLane = useMemo(() => {
    const grouped = { approve: [], kitchen: [], ready: [] } as Record<LaneKey, ServiceOrder[]>;
    for (const order of orders ?? []) {
      const lane = LANES.find((l) => l.match(order.status));
      if (lane) grouped[lane.key].push(order);
    }
    // Oldest first everywhere — the queue is a queue.
    for (const key of Object.keys(grouped) as LaneKey[]) {
      grouped[key].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
    return grouped;
  }, [orders]);

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[280px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-16 text-center">
        <AlertTriangle className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">{t("loadFailed")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Lane switcher — the primary navigation on a phone, a live count
          summary on a tablet where all three lanes are visible at once. */}
      <div
        className="flex items-center gap-2 overflow-x-auto no-scrollbar lg:hidden"
        role="tablist"
        aria-label={t("laneApprove")}
      >
        {LANES.map((lane) => {
          const count = byLane[lane.key].length;
          const active = activeLane === lane.key;
          return (
            <button
              key={lane.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveLane(lane.key)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-[13px] font-bold transition-all",
                active
                  ? "border-black bg-black text-white shadow-sm dark:border-white dark:bg-white dark:text-black"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t(lane.label)}
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums",
                  active ? "bg-white/20 dark:bg-black/20" : "bg-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {LANES.map((lane) => {
          const laneOrders = byLane[lane.key];
          const LaneIcon = lane.icon;
          return (
            <section
              key={lane.key}
              // One lane at a time on a phone; all three side by side from lg up.
              className={cn(
                "flex-col gap-3",
                activeLane === lane.key ? "flex" : "hidden lg:flex",
              )}
              aria-label={t(lane.label)}
            >
              <header className="hidden items-center gap-2 px-1 lg:flex">
                <LaneIcon className={cn("size-4", lane.accent)} aria-hidden="true" />
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t(lane.label)}
                </h2>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-muted-foreground">
                  {laneOrders.length}
                </span>
              </header>

              {laneOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center">
                  <LaneIcon className="size-6 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">{t(lane.empty)}</p>
                  <p className="text-xs text-muted-foreground">{t("allClear")}</p>
                </div>
              ) : (
                laneOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    lane={lane.key}
                    locale={locale}
                    now={now}
                    availability={availability}
                    busy={statusMutation.isPending}
                    onStatus={(to) => statusMutation.mutate({ order, to })}
                    onToggleAvailability={(itemId, inStock) =>
                      availabilityMutation.mutate({ itemId, inStock })
                    }
                  />
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  lane,
  locale,
  now,
  availability,
  busy,
  onStatus,
  onToggleAvailability,
}: {
  order: ServiceOrder;
  lane: LaneKey;
  locale: string;
  now: number;
  availability: Record<string, boolean> | undefined;
  busy: boolean;
  onStatus: (to: OrderStatus) => void;
  onToggleAvailability: (itemId: string, inStock: boolean) => void;
}) {
  const t = useTranslations("Service");
  const code = order.id.slice(0, 5).toUpperCase();

  // Ready orders age from the moment the kitchen finished, not from when the
  // customer ordered — that is the number telling a waiter the food is dying
  // under the pass.
  const since = lane === "ready" && order.ready_at ? order.ready_at : order.created_at;
  const ageMins = Math.floor((now - new Date(since).getTime()) / 60000);
  const isWarning = ageMins >= 10 && ageMins < 20;
  const isDanger = ageMins >= 20;

  const soldOutLines = order.items.filter(
    (l) => availability && availability[l.item_id] === false,
  );

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all",
        isDanger
          ? "border-red-500/50 shadow-red-500/10"
          : isWarning
            ? "border-orange-500/50"
            : "border-border",
      )}
    >
      <header
        className={cn(
          "flex items-start justify-between gap-3 border-b border-border p-3",
          isDanger ? "bg-red-500/10" : isWarning ? "bg-orange-500/10" : "bg-accent/30",
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-extrabold">
            #{code}
            {order.table_number && (
              <span className="rounded-md bg-black px-2 py-0.5 text-xs font-bold text-white dark:bg-white dark:text-black">
                {t("table")} {order.table_number}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
            {order.type === "dine_in" ? t("dineIn") : t("delivery")}
            {order.customer_name ? ` · ${order.customer_name}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "flex items-center justify-end gap-1 text-xs font-bold",
              isDanger
                ? "text-red-500"
                : isWarning
                  ? "text-orange-500"
                  : "text-muted-foreground",
            )}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            {formatDistanceToNowStrict(new Date(since), {
              locale: dateFnsLocale(locale),
              addSuffix: false,
            })}
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
            {formatPrice(order.total)}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-2.5 p-3">
        {order.items.map((line, i) => {
          const inStock = availability?.[line.item_id];
          const soldOut = inStock === false;
          return (
            <div key={`${line.item_id}-${i}`} className="flex gap-2.5">
              <span className="w-6 shrink-0 text-[15px] font-extrabold tabular-nums">
                {line.quantity}×
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[14px] font-bold leading-snug",
                      soldOut && "text-muted-foreground line-through",
                    )}
                  >
                    {line.name}
                  </span>
                  {soldOut && (
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-red-600 dark:text-red-400">
                      {t("soldOut")}
                    </span>
                  )}
                </div>
                {line.options.length > 0 && (
                  <div className="mt-0.5 text-[12px] font-medium leading-tight text-muted-foreground">
                    {line.options.map((opt) => (
                      <span key={opt} className="block">
                        — {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Availability is only the waiter's business while deciding
                  whether to approve; once the kitchen has it, it is too late. */}
              {lane === "approve" && inStock !== undefined && (
                <button
                  type="button"
                  onClick={() => onToggleAvailability(line.item_id, soldOut)}
                  title={soldOut ? t("markAvailable") : t("markSoldOut")}
                  aria-label={soldOut ? t("markAvailable") : t("markSoldOut")}
                  className="shrink-0 self-start rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {soldOut ? (
                    <RotateCcw className="size-4" aria-hidden="true" />
                  ) : (
                    <PackageX className="size-4" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          );
        })}

        {order.note && (
          <p className="mt-1 rounded-lg border border-yellow-200 bg-yellow-50 p-2.5 text-[13px] font-medium italic text-yellow-800 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-200">
            {t("note")}: {order.note}
          </p>
        )}

        {lane === "approve" && soldOutLines.length > 0 && (
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-red-600 dark:text-red-400">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
            {t("soldOutWarning")}
          </p>
        )}
      </div>

      {lane === "approve" && (
        <footer className="flex gap-2 border-t border-border p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("cancelled")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-[14px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <Ban className="size-4" aria-hidden="true" />
            {t("reject")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("confirmed")}
            className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-[#ec5b1a] py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#d94a09] disabled:opacity-50"
          >
            <Check className="size-4" aria-hidden="true" />
            {t("approve")}
          </button>
        </footer>
      )}

      {lane === "kitchen" && (
        <footer className="border-t border-border px-3 py-2.5 text-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("waiting")}
        </footer>
      )}

      {lane === "ready" && (
        <footer className="border-t border-border p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("served")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="size-4" aria-hidden="true" />
            {t("serve")}
          </button>
        </footer>
      )}
    </article>
  );
}
