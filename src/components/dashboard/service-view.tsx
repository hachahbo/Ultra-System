"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  ArrowUpDown,
  Ban,
  Check,
  ChefHat,
  ClipboardCheck,
  Clock,
  PackageX,
  RotateCcw,
  Search,
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
import { isInKitchen, normalizeOrderStatus, type OrderStatus } from "@/lib/order-flow";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

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
  // Normalised at the boundary so every lane predicate below compares against
  // a status this build knows. An un-migrated database still returns the
  // pre-0030 'new'/'done', which match no lane at all — the order would not
  // error, it would just silently never appear on the board.
  return ((orders ?? []) as ServiceOrder[]).map((o) => ({
    ...o,
    status: normalizeOrderStatus(o.status),
  }));
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

/**
 * Carries the server's authoritative row back to onError so a lost optimistic
 * race can be reconciled instead of rolled back. A 409 is not a failure the
 * user has to care about — it means our `updated_at` was stale, and the body
 * hands us the fresh one.
 */
class OrderConflictError extends Error {
  constructor(message: string, readonly fresh: ServiceOrder | null) {
    super(message);
    this.name = "OrderConflictError";
  }
}

/**
 * Returns the row the DATABASE holds after the write, which is not the row we
 * asked for: `orders_touch_updated_at` (0010) rewrites updated_at on every
 * UPDATE, and approving fires fan_order_to_kds (0030 §4) whose nested
 * `set status='preparing'` bumps it a second time. Callers must feed this back
 * into the cache — the next PATCH's optimistic-concurrency predicate compares
 * against updated_at, so a cache holding a stale one 409s on the next click.
 */
async function patchStatus(order: ServiceOrder, status: OrderStatus): Promise<ServiceOrder> {
  const res = await fetch(`/api/dashboard/orders/${order.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, updated_at: order.updated_at }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 409) {
      throw new OrderConflictError(
        body?.error ?? "Commande déjà mise à jour",
        (body?.order ?? null) as ServiceOrder | null,
      );
    }
    throw new Error(body?.error ?? "status update failed");
  }
  return body.order as ServiceOrder;
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
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    key: "kitchen",
    label: "laneKitchen",
    empty: "emptyKitchen",
    icon: ChefHat,
    match: isInKitchen,
    accent: "text-orange-600 dark:text-orange-400",
    badgeBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  {
    key: "ready",
    label: "laneReady",
    empty: "emptyReady",
    icon: UtensilsCrossed,
    match: (s: OrderStatus) => s === "ready",
    accent: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
] as const;

type LaneKey = (typeof LANES)[number]["key"];
type ChannelFilter = "all" | "dine_in" | "takeaway" | "delivery";

// Helper to derive order channel type
function channelTypeOf(order: ServiceOrder): ChannelFilter {
  if (order.type === "dine_in") return "dine_in";
  const noteLower = (order.note ?? "").toLowerCase();
  if (noteLower.includes("takeaway") || noteLower.includes("emporter")) return "takeaway";
  return "delivery";
}

// ── Component ──────────────────────────────────────────────────────────────

export function ServiceView({ kdsEnabled }: { kdsEnabled: boolean }) {
  const locale = useLocale();
  const t = useTranslations("Service");
  const queryClient = useQueryClient();

  const [activeLane, setActiveLane] = useState<LaneKey>("approve");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => Date.now());

  // Re-tick every 15s to keep live age numbers accurate
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // Realtime is an accelerator, not the guarantee. The subscription below only
  // delivers to a client whose socket carries a session JWT — RLS on `orders`
  // is tenant-scoped, so an unauthenticated socket matches no rows and is
  // simply told nothing. That failure is silent and one-sided: everything the
  // waiter does themselves repaints from the mutation's own invalidate, so the
  // board only looks stuck for changes made in someone ELSE's browser —
  // exactly the kitchen bumping a ticket. Poll on the same 10s cadence as
  // orders-view.tsx so the lane is correct within one tick regardless.
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    refetchInterval: 10_000,
  });

  const { data: availability } = useQuery({
    queryKey: ["menu-availability"],
    queryFn: fetchAvailability,
    staleTime: 60_000,
  });

  // Supabase Realtime subscription
  //
  // supabase-js authenticates the realtime socket from _handleTokenChanged,
  // which only calls realtime.setAuth(token) on the SIGNED_IN and
  // TOKEN_REFRESHED auth events — never on INITIAL_SESSION, which is what
  // fires for a session that already existed when this client was constructed
  // (i.e. any waiter who logged in earlier and is just viewing this page —
  // the normal case, not the exception). Left alone, the socket joins on the
  // anon key and RLS on `orders` (tenant-scoped via my_restaurant_id(), which
  // needs auth.uid()) matches nothing for it — silently, with no error, until
  // the access token happens to refresh on its own timer. This is why a bump
  // on the KDS (a change made in someone else's browser, from another role)
  // was not reaching this board: reading the session and calling setAuth
  // explicitly before subscribing closes that gap, and listening for
  // TOKEN_REFRESHED keeps the shift's session authenticated.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const subscribe = () => {
      if (cancelled || channel) return;
      channel = supabase
        .channel("service-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
        )
        .subscribe();
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) await supabase.realtime.setAuth(session.access_token);
      subscribe();
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Sound & notification alert on ready orders
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

  /** Replace one order in the cache with the server's own copy of it. */
  const commitOrder = useCallback(
    (fresh: ServiceOrder) => {
      queryClient.setQueryData<ServiceOrder[]>(["orders"], (old) =>
        (old ?? []).map((o) => (o.id === fresh.id ? fresh : o)),
      );
    },
    [queryClient],
  );

  const statusMutation = useMutation({
    mutationFn: ({ order, to }: { order: ServiceOrder; to: OrderStatus }) =>
      patchStatus(order, to),
    onMutate: async ({ order, to }) => {
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const prev = queryClient.getQueryData<ServiceOrder[]>(["orders"]);
      const optimistic = to === "confirmed" ? "preparing" : to;
      queryClient.setQueryData<ServiceOrder[]>(["orders"], (old) =>
        (old ?? []).map((o) => (o.id === order.id ? { ...o, status: optimistic } : o)),
      );
      return { prev };
    },
    // The optimistic row above moved the card to its new lane but kept the OLD
    // updated_at, which is exactly the value the next PATCH would send as its
    // concurrency predicate — and the server has since bumped it (twice, when
    // approving). Overwriting with the returned row is what stops the second
    // click on a card from 409-ing before the onSettled refetch lands.
    onSuccess: (fresh) => commitOrder(fresh),
    onError: (err, _vars, ctx) => {
      // A 409 means someone (or our own stale cache) beat us to it. The server
      // sent the winning row, so heal the board with it rather than reverting
      // to a snapshot that is even older.
      if (err instanceof OrderConflictError) {
        if (err.fresh) commitOrder(err.fresh);
        else if (ctx?.prev) queryClient.setQueryData(["orders"], ctx.prev);
        toast.warning(err.message);
        return;
      }
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

  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    const key = `${orderId}:${itemIdx}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Group & Filter Orders
  const { byLane, stats, channelCounts } = useMemo(() => {
    const allOrders = orders ?? [];
    const grouped = { approve: [], kitchen: [], ready: [] } as Record<LaneKey, ServiceOrder[]>;
    
    // Calculate stats
    let totalPrepSec = 0;
    let openCount = 0;
    let lateCount = 0;
    let servedCount = 0;

    const counts: Record<ChannelFilter, number> = { all: allOrders.length, dine_in: 0, takeaway: 0, delivery: 0 };

    for (const order of allOrders) {
      const ch = channelTypeOf(order);
      counts[ch] += 1;

      if (order.status === "served") {
        servedCount += 1;
        continue;
      }

      if (order.status === "cancelled") continue;

      openCount += 1;
      const createdTime = new Date(order.created_at).getTime();
      const ageSec = Math.floor((now - createdTime) / 1000);
      totalPrepSec += ageSec;

      if (ageSec >= 12 * 60) lateCount += 1;

      // Filter by Channel
      if (channelFilter !== "all" && ch !== channelFilter) continue;

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = order.id.slice(0, 5).toLowerCase();
        const table = (order.table_number ?? "").toLowerCase();
        const customer = (order.customer_name ?? "").toLowerCase();
        const matchItem = order.items.some((i) => i.name.toLowerCase().includes(q));
        if (!code.includes(q) && !table.includes(q) && !customer.includes(q) && !matchItem) {
          continue;
        }
      }

      const lane = LANES.find((l) => l.match(order.status));
      if (lane) grouped[lane.key].push(order);
    }

    // Sort orders
    for (const key of Object.keys(grouped) as LaneKey[]) {
      grouped[key].sort((a, b) => {
        const tA = new Date(a.created_at).getTime();
        const tB = new Date(b.created_at).getTime();
        return sortOrder === "oldest" ? tA - tB : tB - tA;
      });
    }

    const avgSec = openCount > 0 ? Math.floor(totalPrepSec / openCount) : 0;
    const avgMin = Math.floor(avgSec / 60);
    const avgRemainderSec = avgSec % 60;
    const avgFormatted = `${avgMin}:${String(avgRemainderSec).padStart(2, "0")}`;

    return {
      byLane: grouped,
      stats: { open: openCount, avgFormatted, late: lateCount, served: servedCount },
      channelCounts: counts,
    };
  }, [orders, now, channelFilter, searchQuery, sortOrder]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[320px] rounded-2xl" />
          ))}
        </div>
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

  const channels: { key: ChannelFilter; label: string }[] = [
    { key: "all", label: "filterAll" },
    { key: "dine_in", label: "filterDineIn" },
    { key: "takeaway", label: "filterTakeaway" },
    { key: "delivery", label: "filterDelivery" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards & Toolbar */}
      <div className="flex flex-col gap-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground">
              {t("statOpen")}
            </span>
            <span className="mt-1 text-2xl font-black tracking-tight tabular-nums text-foreground">
              {stats.open}
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground">
              {t("statAvg")}
            </span>
            <span className="mt-1 text-2xl font-black tracking-tight tabular-nums text-foreground">
              {stats.avgFormatted}
            </span>
          </div>

          <div
            className={cn(
              "flex flex-col rounded-xl border p-3.5 shadow-xs transition-colors",
              stats.late > 0
                ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                : "border-border bg-card text-foreground"
            )}
          >
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground">
              {t("statLate")}
            </span>
            <span className="mt-1 text-2xl font-black tracking-tight tabular-nums">
              {stats.late}
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground">
              {t("statServed")}
            </span>
            <span className="mt-1 text-2xl font-black tracking-tight tabular-nums text-foreground">
              {stats.served}
            </span>
          </div>
        </div>

        {/* Toolbar: Channel Filter Pills, Search & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Channel Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {channels.map((ch) => {
              const active = channelFilter === ch.key;
              const count = channelCounts[ch.key];
              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => setChannelFilter(ch.key)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                    active
                      ? "border-foreground bg-foreground text-background shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {t(ch.label)}
                  <span
                    className={cn(
                      "min-w-4 rounded-md px-1 py-0.2 text-[10px] font-extrabold tabular-nums text-center",
                      active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-1 items-center justify-end gap-2 min-w-[280px]">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs focus-within:border-ring focus-within:ring-1 focus-within:ring-ring flex-1 sm:max-w-xs">
              <Search className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === "oldest" ? "newest" : "oldest"))}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <ArrowUpDown className="size-3.5" aria-hidden="true" />
              {sortOrder === "oldest" ? t("sortOldest") : t("sortNewest")}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div
        className="flex items-center gap-2 overflow-x-auto no-scrollbar lg:hidden"
        role="tablist"
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
                "flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-all",
                active
                  ? "border-foreground bg-foreground text-background shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {t(lane.label)}
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums",
                  active ? "bg-background/20" : "bg-muted"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3-Column Kanban Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {LANES.map((lane) => {
          const laneOrders = byLane[lane.key];
          const LaneIcon = lane.icon;
          return (
            <section
              key={lane.key}
              className={cn(
                "flex-col gap-3",
                activeLane === lane.key ? "flex" : "hidden lg:flex"
              )}
              aria-label={t(lane.label)}
            >
              <header className="flex items-center gap-2 px-1 py-0.5">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg border text-xs font-bold",
                    lane.badgeBg
                  )}
                >
                  <LaneIcon className="size-4" aria-hidden="true" />
                </div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t(lane.label)}
                </h2>
                <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-muted-foreground">
                  {laneOrders.length}
                </span>
              </header>

              {laneOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center bg-card/40">
                  <LaneIcon className="size-6 text-muted-foreground/30" aria-hidden="true" />
                  <p className="text-sm font-bold text-foreground">{t(lane.empty)}</p>
                  <p className="text-xs text-muted-foreground">{t("allClear")}</p>
                </div>
              ) : (
                laneOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    lane={lane.key}
                    kdsEnabled={kdsEnabled}
                    locale={locale}
                    now={now}
                    availability={availability}
                    checkedItems={checkedItems}
                    onToggleCheck={toggleItemCheck}
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

// ── Card Component ─────────────────────────────────────────────────────────

function OrderCard({
  order,
  lane,
  kdsEnabled,
  locale,
  now,
  availability,
  checkedItems,
  onToggleCheck,
  busy,
  onStatus,
  onToggleAvailability,
}: {
  order: ServiceOrder;
  lane: LaneKey;
  kdsEnabled: boolean;
  locale: string;
  now: number;
  availability: Record<string, boolean> | undefined;
  checkedItems: Record<string, boolean>;
  onToggleCheck: (orderId: string, itemIdx: number) => void;
  busy: boolean;
  onStatus: (to: OrderStatus) => void;
  onToggleAvailability: (itemId: string, inStock: boolean) => void;
}) {
  const t = useTranslations("Service");
  const code = order.id.slice(0, 5).toUpperCase();

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
        "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-all",
        isDanger
          ? "border-red-500/50 shadow-red-500/10"
          : isWarning
            ? "border-amber-500/50"
            : "border-border"
      )}
    >
      {/* Card Header */}
      <header
        className={cn(
          "flex items-start justify-between gap-3 border-b border-border p-3.5",
          isDanger ? "bg-red-500/10" : isWarning ? "bg-amber-500/10" : "bg-muted/40"
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-base font-extrabold tracking-tight">
            #{code}
            {order.table_number && (
              <span className="rounded-md bg-foreground px-2 py-0.5 text-xs font-bold text-background">
                {t("table")} {order.table_number}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-muted-foreground">
            {order.type === "dine_in" ? t("dineIn") : t("delivery")}
            {order.customer_name ? ` · ${order.customer_name}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "flex items-center justify-end gap-1 text-xs font-extrabold tabular-nums",
              isDanger
                ? "text-red-600 dark:text-red-400"
                : isWarning
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
            )}
          >
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            {formatDistanceToNowStrict(new Date(since), {
              locale: dateFnsLocale(locale),
              addSuffix: false,
            })}
          </div>
          <div className="mt-0.5 text-[11px] font-bold text-foreground tabular-nums">
            {formatPrice(order.total)}
          </div>
        </div>
      </header>

      {/* Card Body & Plating Checklist */}
      <div className="flex flex-col gap-2.5 p-3.5">
        {order.items.map((line, i) => {
          const inStock = availability?.[line.item_id];
          const soldOut = inStock === false;
          const isChecked = !!checkedItems[`${order.id}:${i}`];

          return (
            <div
              key={`${line.item_id}-${i}`}
              onClick={() => lane === "kitchen" && onToggleCheck(order.id, i)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg py-1 px-1 transition-colors",
                lane === "kitchen" && "cursor-pointer hover:bg-accent/50"
              )}
            >
              <span
                className={cn(
                  "min-w-6 shrink-0 text-center text-xs font-extrabold tabular-nums rounded-md py-0.5 px-1 bg-muted/60 text-muted-foreground",
                  isChecked && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {line.quantity}×
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "text-xs font-bold leading-snug text-foreground transition-all",
                      soldOut && "text-muted-foreground line-through",
                      isChecked && "text-muted-foreground line-through opacity-70"
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
                  <div className="mt-0.5 text-[11px] font-medium leading-tight text-muted-foreground">
                    {line.options.map((opt) => (
                      <span key={opt} className="block">
                        — {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Plating Checklist Checkmark in Kitchen Lane */}
              {lane === "kitchen" && (
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-all mt-0.5",
                    isChecked
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-card text-transparent hover:border-muted-foreground"
                  )}
                >
                  <Check className="size-3 stroke-[3]" aria-hidden="true" />
                </div>
              )}

              {/* Availability Toggle in Approve Lane */}
              {lane === "approve" && inStock !== undefined && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAvailability(line.item_id, soldOut);
                  }}
                  title={soldOut ? t("markAvailable") : t("markSoldOut")}
                  aria-label={soldOut ? t("markAvailable") : t("markSoldOut")}
                  className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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

        {/* Customer Note */}
        {order.note && (
          <p className="mt-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-semibold italic text-amber-700 dark:text-amber-300">
            {t("note")}: {order.note}
          </p>
        )}

        {/* 86 Warning in Approve Lane */}
        {lane === "approve" && soldOutLines.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
            {t("soldOutWarning")}
          </p>
        )}
      </div>

      {/* Card Actions Footer */}
      {lane === "approve" && (
        <footer className="flex gap-2 border-t border-border p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("cancelled")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <Ban className="size-4" aria-hidden="true" />
            {t("reject")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("confirmed")}
            className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
          >
            <Check className="size-4" aria-hidden="true" />
            {t("approve")}
          </button>
        </footer>
      )}

      {/* With a live KDS the kitchen owns this call: every station bumps its own
          ticket and sync_order_ready_from_tickets() (0030 §6) flips the order to
          'ready' only once all of them are in. A per-order button here would let
          the cold station declare a table's food ready while the grill is still
          working — exactly what that trigger exists to prevent. Without KDS the
          button is the only way anyone can say the food is done, so it stays. */}
      {lane === "kitchen" && !kdsEnabled && (
        <footer className="border-t border-border p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("ready")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
          >
            <Check className="size-4" aria-hidden="true" />
            {t("markReady")}
          </button>
        </footer>
      )}

      {lane === "kitchen" && kdsEnabled && (
        <footer className="flex items-center justify-center gap-2 border-t border-border p-3 text-xs font-bold text-muted-foreground">
          <ChefHat className="size-4 shrink-0" aria-hidden="true" />
          {t("awaitingKitchen")}
        </footer>
      )}

      {lane === "ready" && (
        <footer className="border-t border-border p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("served")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="size-4" aria-hidden="true" />
            {t("serve")}
          </button>
        </footer>
      )}
    </article>
  );
}
