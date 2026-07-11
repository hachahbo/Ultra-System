"use client";

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
import { HourlyChart } from "@/components/dashboard/hourly-chart";
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

  return (
    <motion.div layout className="space-y-4 md:space-y-6">
      {/* TOP ROW: 4 Main Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        <FadeUp delay={0}>
          <StatCard
            label="Commandes aujourd'hui"
            value={ordersToday}
            deltaPct={ordersDeltaPct}
            icon={ChefHat}
            iconTone="brand"
          />
        </FadeUp>
        <FadeUp delay={0.04}>
          <StatCard
            label="Revenu aujourd'hui"
            value={revenueToday}
            unit={currency}
            deltaPct={revenueDeltaPct}
            icon={Coins}
            iconTone="green"
          />
        </FadeUp>
        <FadeUp delay={0.08}>
          <StatCard
            label="Réservations en attente"
            value={pendingReservations}
            deltaPct={reservationsDeltaPct}
            icon={CalendarClock}
            iconTone="amber"
          />
        </FadeUp>
        <FadeUp delay={0.12}>
          <StatCard
            label="Nouveaux clients"
            value={newCustomers}
            deltaPct={customersDeltaPct}
            icon={UserPlus}
            iconTone="purple"
          />
        </FadeUp>
      </div>

      {/* MIDDLE ROW: Chart + Pie Chart Placeholder */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
        <FadeUp delay={0.16} className="lg:col-span-2">
          <div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Rythme de la journée</h2>
                <p className="text-sm text-muted-foreground">Aperçu des ventes</p>
              </div>
            </div>
            <div className="min-h-[300px] flex-1">
              <HourlyChart data={hourly} />
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.2} className="lg:col-span-1">
          <div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm md:p-6">
            <h2 className="font-display text-lg font-semibold mb-6">Répartition par type</h2>
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              {/* Simple CSS Donut Chart for visualization matching the inspiration */}
              <div className="relative size-40 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border-[12px] border-primary/20 dark:border-primary/10">
                 <div className="absolute inset-0 rounded-full border-[12px] border-blue-500/80 border-r-transparent border-t-transparent -rotate-45" />
                 <div className="absolute inset-0 rounded-full border-[12px] border-amber-500/80 border-l-transparent border-b-transparent rotate-12" />
                 <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-foreground">75%</span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sur place</span>
                 </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground w-full px-4">
                 <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-primary/20" /> Sur place</div>
                 <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-blue-500/80" /> Livraison</div>
                 <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-amber-500/80" /> À emporter</div>
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
                            "rounded-md border-transparent bg-neutral-100 dark:bg-neutral-800 text-muted-foreground",
                            o.status === "done" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            o.status === "preparing" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            o.status === "new" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
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
