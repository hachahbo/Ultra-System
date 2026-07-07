"use client";

import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";
import { AlertTriangle, Building2, CreditCard, ShoppingBag, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPrice, formatDateTime } from "@/lib/format";
import type { Plan, RestaurantStatus } from "@/lib/types";

type AdminAnalytics = {
  restaurantCount: number;
  statusCounts: Record<RestaurantStatus, number>;
  planCounts: Record<Plan, number>;
  activeSubscriptions: number;
  mrr: number;
  totalOrders: number;
  totalRevenue: number;
  revenueSeries: { date: string; revenue: number; orders: number }[];
  expiringTrials: { restaurantId: string; restaurantName: string; trialEndsAt: string }[];
};

async function fetchAnalytics(): Promise<AdminAnalytics> {
  const res = await fetch("/api/admin/analytics");
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

const revenueConfig: ChartConfig = {
  revenue: { label: "Revenu", color: "var(--chart-1)" },
};

const planColors: Record<Plan, string> = {
  free: "var(--chart-3)",
  pro: "var(--chart-1)",
  enterprise: "var(--chart-2)",
};
const planLabels: Record<Plan, string> = { free: "Free", pro: "Pro", enterprise: "Enterprise" };

export function OverviewView() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: fetchAnalytics,
  });

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-muted-foreground">
        Impossible de charger les statistiques.
      </p>
    );
  }

  const cards = [
    { label: "Restaurants", value: String(data.restaurantCount), icon: Building2 },
    { label: "Abonnements actifs", value: String(data.activeSubscriptions), icon: CreditCard },
    { label: "MRR", value: formatPrice(data.mrr), icon: Wallet },
    { label: "Commandes (30 j)", value: String(data.totalOrders), icon: ShoppingBag },
  ];

  const planDonut = (Object.keys(data.planCounts) as Plan[])
    .filter((p) => data.planCounts[p] > 0)
    .map((p) => ({ plan: p, label: planLabels[p], count: data.planCounts[p] }));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Vue d&apos;ensemble</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Toutes les données ci-dessous agrègent l&apos;ensemble des restaurants.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="gap-1.5 p-4">
            <c.icon className="size-4 text-muted-foreground" />
            <p className="mt-1 text-xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {data.expiringTrials.length > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              {data.expiringTrials.length} essai
              {data.expiringTrials.length > 1 ? "s" : ""} expirant sous 7 jours
            </p>
            <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/80">
              {data.expiringTrials
                .map((t) => `${t.restaurantName} (${formatDateTime(t.trialEndsAt)})`)
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <p className="text-sm font-medium">Revenu — 30 derniers jours</p>
          {data.revenueSeries.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Aucune commande sur la période.
            </p>
          ) : (
            <ChartContainer config={revenueConfig} className="mt-4 h-56 w-full">
              <AreaChart data={data.revenueSeries}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  fill="var(--color-revenue)"
                  fillOpacity={0.2}
                  stroke="var(--color-revenue)"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-sm font-medium">Répartition par plan</p>
          {planDonut.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Aucun restaurant.
            </p>
          ) : (
            <ChartContainer config={revenueConfig} className="mx-auto mt-4 aspect-square max-h-56">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={planDonut} dataKey="count" nameKey="label" innerRadius={50}>
                  {planDonut.map((entry) => (
                    <Cell key={entry.plan} fill={planColors[entry.plan]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
