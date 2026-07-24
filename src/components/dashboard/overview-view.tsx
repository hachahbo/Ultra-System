"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CalendarDays,
  ChefHat,
  Coins,
  ShoppingBag,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Users
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { FadeUp } from "@/components/dashboard/motion";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDateTime } from "@/lib/format";
import { ORDER_STATUS_DOT, RESERVATION_STATUS_DOT } from "@/components/dashboard/status-dot";
import type { Order, Reservation } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OverviewView({
  currency,
  ordersToday,
  ordersDeltaPct,
  ordersSeries,
  revenueToday,
  revenueDeltaPct,
  revenueSeries,
  pendingReservations,
  reservationsDeltaPct,
  reservationsSeries,
  newCustomers,
  customersDeltaPct,
  customersSeries,
  hourly,
  lastOrders,
  todaysReservations,
}: {
  currency: string;
  ordersToday: number;
  ordersDeltaPct: number;
  ordersSeries: number[];
  revenueToday: number;
  revenueDeltaPct: number;
  revenueSeries: number[];
  pendingReservations: number;
  reservationsDeltaPct: number;
  reservationsSeries: number[];
  newCustomers: number;
  customersDeltaPct: number;
  customersSeries: number[];
  hourly: { hour: number; orders: number }[];
  lastOrders: Order[];
  todaysReservations: Pick<Reservation, "id" | "customer_name" | "party_size" | "time" | "status">[];
}) {
  const panierMoyen = ordersToday > 0 ? revenueToday / ordersToday : 0;
  const [timeRange, setTimeRange] = useState<"today" | "week">("today");
  const [hoveredSegment, setHoveredSegment] = useState<"sur_place" | "livraison" | "a_emporter" | null>(null);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  const dataToday = [
    { time: "11h", value: 30, orders: 12 },
    { time: "12h", value: 45, orders: 18 },
    { time: "13h", value: 85, orders: 34 },
    { time: "14h", value: 65, orders: 26 },
    { time: "15h", value: 35, orders: 14 },
    { time: "16h", value: 40, orders: 16 },
    { time: "17h", value: 50, orders: 20 },
    { time: "18h", value: 60, orders: 24 },
    { time: "19h", value: 70, orders: 28 },
    { time: "20h", value: 80, orders: 32 },
    { time: "21h", value: 95, orders: 38 },
    { time: "22h", value: 75, orders: 30 },
    { time: "23h", value: 45, orders: 18 },
  ];

  const dataWeek = [
    { time: "11h", value: 50, orders: 150 },
    { time: "12h", value: 65, orders: 195 },
    { time: "13h", value: 95, orders: 285 },
    { time: "14h", value: 85, orders: 255 },
    { time: "15h", value: 45, orders: 135 },
    { time: "16h", value: 55, orders: 165 },
    { time: "17h", value: 70, orders: 210 },
    { time: "18h", value: 80, orders: 240 },
    { time: "19h", value: 90, orders: 270 },
    { time: "20h", value: 100, orders: 300 },
    { time: "21h", value: 85, orders: 255 },
    { time: "22h", value: 60, orders: 180 },
    { time: "23h", value: 40, orders: 120 },
  ];

  const currentData = timeRange === "today" ? dataToday : dataWeek;
  const maxVal = Math.max(...currentData.map(d => d.value));

  return (
    <motion.div layout className="space-y-4 md:space-y-6">
      {/* TOP ROW: 4 Main Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        <FadeUp delay={0}>
          <StatCard
            label="Commandes aujourd'hui"
            value={ordersToday}
            deltaPct={ordersDeltaPct}
            iconUrl="/images/Group (5).svg"
            variant="solid-dark"
          />
        </FadeUp>
        <FadeUp delay={0.04}>
          <StatCard
            label="Revenu aujourd'hui"
            value={revenueToday}
            unit={currency}
            deltaPct={revenueDeltaPct}
            iconUrl="/images/Group (2).svg"
            variant="solid-orange"
          />
        </FadeUp>
        <FadeUp delay={0.08}>
          <StatCard
            label="Réservations en attente"
            value={pendingReservations}
            deltaPct={reservationsDeltaPct}
            iconUrl="/images/Group (6).svg"
            variant="solid-black"
          />
        </FadeUp>
        <FadeUp delay={0.12}>
          <StatCard
            label="Nouveaux clients"
            value={newCustomers}
            deltaPct={customersDeltaPct}
            iconUrl="/images/Group (1).svg"
            variant="solid-black"
          />
        </FadeUp>
      </div>

      {/* MIDDLE ROW: Custom Charts matching the new design */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
        <FadeUp delay={0.16} className="lg:col-span-2">
          <div className="flex h-full flex-col rounded-[28px] border bg-card p-5 sm:p-6 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Rythme de la journée</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Commandes par créneau</p>
              </div>
              <div className="flex items-center rounded-xl border border-border/50 bg-background/80 dark:bg-neutral-900/60 p-1 shadow-sm w-fit">
                <button
                  onClick={() => { setTimeRange("today"); setActiveBarIndex(null); }}
                  className={cn(
                    "rounded-lg px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors",
                    timeRange === "today"
                      ? "bg-[#e36329] text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => { setTimeRange("week"); setActiveBarIndex(null); }}
                  className={cn(
                    "rounded-lg px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors",
                    timeRange === "week"
                      ? "bg-[#e36329] text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Semaine
                </button>
              </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 flex flex-col justify-end pt-8 pb-1">
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-[190px] sm:h-[230px] px-0.5 sm:px-2 relative">
                {currentData.map((item, i) => {
                  const isPeak = item.value === maxVal;
                  const isSelected = activeBarIndex === i || (activeBarIndex === null && isPeak);

                  return (
                    <div
                      key={i}
                      onClick={() => setActiveBarIndex(i)}
                      onMouseEnter={() => setActiveBarIndex(i)}
                      className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer relative"
                    >
                      {/* Floating Tooltip Badge */}
                      {isSelected && (
                        <div className="absolute -top-10 z-20 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[11px] sm:text-xs font-extrabold px-2.5 py-1 rounded-full shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 border border-white/10 dark:border-black/10">
                          {item.orders} cmd
                        </div>
                      )}

                      {/* Bar Pill */}
                      <div className="w-full max-w-[40px] sm:max-w-[48px] h-full flex items-end">
                        <div
                          className={cn(
                            "w-full rounded-t-xl sm:rounded-t-2xl transition-all duration-300 ease-out min-h-[18px]",
                            isSelected
                              ? "bg-[#e36329] shadow-[0_4px_16px_rgba(227,99,41,0.45)] scale-x-105"
                              : "bg-[#f2d1c3] dark:bg-[#e36329]/25 hover:bg-[#eb9d7a] dark:hover:bg-[#e36329]/45"
                          )}
                          style={{ height: `${Math.max(16, item.value)}%` }}
                        />
                      </div>

                      {/* Time Label */}
                      <span
                        className={cn(
                          "mt-2.5 text-[10px] sm:text-xs font-bold transition-colors",
                          isSelected
                            ? "text-[#e36329]"
                            : "text-muted-foreground group-hover:text-foreground",
                          i % 2 !== 0 && "max-sm:hidden"
                        )}
                      >
                        {item.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.2} className="lg:col-span-1">
          <div className="flex h-full flex-col rounded-[24px] border bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-foreground mb-8">Répartition par type</h2>
            <div className="flex-1 flex flex-col items-center justify-center gap-10">
              <div className="relative size-[200px]">
                <svg className="size-full -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                  {/* Orange - Sur Place */}
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    className={cn(
                      "stroke-[#e36329] cursor-pointer transition-all duration-300",
                      hoveredSegment && hoveredSegment !== "sur_place" ? "opacity-30" : "opacity-100"
                    )}
                    strokeWidth="14" strokeDasharray="115 136.32" strokeLinecap="round"
                    onMouseEnter={() => setHoveredSegment("sur_place")}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />

                  {/* Navy Blue - A emporter */}
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    className={cn(
                      "stroke-slate-800 dark:stroke-slate-400 cursor-pointer transition-all duration-300",
                      hoveredSegment && hoveredSegment !== "a_emporter" ? "opacity-30" : "opacity-100"
                    )}
                    strokeWidth="14" strokeDasharray="46 205.32" strokeDashoffset="-135" strokeLinecap="round"
                    onMouseEnter={() => setHoveredSegment("a_emporter")}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />

                  {/* Black - Livraison */}
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    className={cn(
                      "stroke-slate-900 dark:stroke-slate-200 cursor-pointer transition-all duration-300",
                      hoveredSegment && hoveredSegment !== "livraison" ? "opacity-30" : "opacity-100"
                    )}
                    strokeWidth="14" strokeDasharray="30.32 221" strokeDashoffset="-201" strokeLinecap="round"
                    onMouseEnter={() => setHoveredSegment("livraison")}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-opacity duration-300">
                  <span className="text-[34px] font-bold text-foreground tracking-tight leading-none">
                    {hoveredSegment === "a_emporter" ? "10%" : hoveredSegment === "livraison" ? "15%" : "75%"}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-2">
                    {hoveredSegment === "a_emporter" ? "À emporter" : hoveredSegment === "livraison" ? "Livraison" : "Sur place"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] font-medium text-muted-foreground w-full px-2">
                <div
                  className={cn("flex items-center gap-2 cursor-pointer transition-opacity duration-300", hoveredSegment && hoveredSegment !== "sur_place" ? "opacity-40" : "opacity-100")}
                  onMouseEnter={() => setHoveredSegment("sur_place")}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <div className="size-3 rounded-full bg-[#e36329]" /> Sur place
                </div>
                <div
                  className={cn("flex items-center gap-2 cursor-pointer transition-opacity duration-300", hoveredSegment && hoveredSegment !== "livraison" ? "opacity-40" : "opacity-100")}
                  onMouseEnter={() => setHoveredSegment("livraison")}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <div className="size-3 rounded-full bg-slate-900 dark:bg-slate-200" /> Livraison
                </div>
                <div
                  className={cn("flex items-center gap-2 cursor-pointer transition-opacity duration-300", hoveredSegment && hoveredSegment !== "a_emporter" ? "opacity-40" : "opacity-100")}
                  onMouseEnter={() => setHoveredSegment("a_emporter")}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <div className="size-3 rounded-full bg-slate-800 dark:bg-slate-400" /> À emporter
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* BOTTOM ROW: Recent Orders + Reservations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
        <FadeUp delay={0.24} className="lg:col-span-2">
          <div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Dernières commandes</h2>
              <Link href="/dashboard/orders" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Voir tout
              </Link>
            </div>

            {lastOrders.length === 0 ? (
              <div className="mt-3 flex-1">
                <EmptyState
                  icon={ShoppingBag}
                  title="Aucune commande aujourd'hui"
                  hint="La première apparaîtra ici automatiquement."
                />
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="pb-3 font-medium">ID</th>
                      <th className="pb-3 font-medium">Client</th>
                      <th className="pb-3 font-medium">Total</th>
                      <th className="pb-3 font-medium">Statut</th>
                      <th className="pb-3 font-medium text-right">Heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {lastOrders.map((o) => (
                      <tr key={o.id} className="transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50">
                        <td className="py-4 pr-4 font-medium text-amber-500/80">
                          #{o.id.split("-")[0].toUpperCase()}
                        </td>
                        <td className="py-4 pr-4">
                          <p className="font-medium text-foreground">
                            {o.type === "dine_in" ? `Table ${o.table_number}` : o.customer_name || "Client"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-[150px] sm:max-w-[200px]">
                            {o.items.map((l) => `${l.quantity}× ${l.name}`).join(", ")}
                          </p>
                        </td>
                        <td className="py-4 pr-4 font-medium tabular-nums text-foreground">
                          {formatPrice(o.total, currency)}
                        </td>
                        <td className="py-4 pr-4">
                          <Badge variant="outline" className={cn(
                            "rounded-md border-transparent bg-neutral-100 dark:bg-neutral-800/80 font-medium",
                            o.status === "done" && "text-emerald-600 dark:text-emerald-500",
                            o.status === "preparing" && "text-amber-600 dark:text-amber-500",
                            o.status === "new" && "text-blue-600 dark:text-blue-500",
                          )}>
                            {o.status === "done" ? "Servi" : o.status === "preparing" ? "En cours" : "Nouveau"}
                          </Badge>
                        </td>
                        <td className="py-4 text-right text-xs text-muted-foreground">
                          {formatDateTime(o.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeUp>

        <FadeUp delay={0.28}>
          <div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Réservations</h2>
              <Link href="/dashboard/reservations" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Voir tout
              </Link>
            </div>

            {todaysReservations.length === 0 ? (
              <div className="mt-3 flex-1">
                <EmptyState
                  icon={CalendarDays}
                  title="Aucune réservation aujourd'hui"
                  hint="Les nouvelles demandes apparaîtront ici."
                />
              </div>
            ) : (
              <div className="flex-1 space-y-4">
                {todaysReservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                        {r.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{r.customer_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.party_size} personnes • {r.status === "confirmed" ? "Confirmé" : "En attente"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">{r.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeUp>
      </div>
    </motion.div>
  );
}
