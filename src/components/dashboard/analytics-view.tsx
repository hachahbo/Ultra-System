"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPrice } from "@/lib/format";
import { chartMargin } from "@/components/dashboard/chart-theme";

type AnalyticsData = {
  revenueSeries: { date: string; revenue: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  typeSplit: { dine_in: number; delivery: number };
  byHour: { hour: number; orders: number }[];
  newVsReturning: { new: number; returning: number };
};

type Range = "7d" | "30d" | "90d";

async function fetchAnalytics(range: Range): Promise<AnalyticsData> {
  const res = await fetch(`/api/dashboard/analytics?range=${range}`);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

const revenueConfig: ChartConfig = {
  revenue: { label: "Revenu", color: "var(--chart-1)" },
};
const ordersConfig: ChartConfig = {
  orders: { label: "Commandes", color: "var(--chart-2)" },
};
const itemsConfig: ChartConfig = {
  quantity: { label: "Quantité", color: "var(--chart-3)" },
};
const typeConfig: ChartConfig = {
  dine_in: { label: "Sur place", color: "var(--chart-1)" },
  delivery: { label: "Livraison", color: "var(--chart-4)" },
};
const returningConfig: ChartConfig = {
  new: { label: "Nouveaux", color: "var(--chart-2)" },
  returning: { label: "Récurrents", color: "var(--chart-5)" },
};

export function AnalyticsView() {
  const [range, setRange] = useState<Range>("30d");
  const { data, isPending } = useQuery({
    queryKey: ["analytics", range],
    queryFn: () => fetchAnalytics(range),
  });

  const totalRevenue = data?.revenueSeries.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalOrders = data?.revenueSeries.reduce((s, d) => s + d.orders, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Statistiques</h1>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            <TabsTrigger value="7d">7 j</TabsTrigger>
            <TabsTrigger value="30d">30 j</TabsTrigger>
            <TabsTrigger value="90d">90 j</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isPending || !data ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Revenu total</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatPrice(totalRevenue)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Commandes</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{totalOrders}</p>
            </Card>
          </div>

          <ChartCard title="Revenu">
            <ChartContainer config={revenueConfig} className="w-full">
              <AreaChart data={data.revenueSeries} margin={chartMargin}>
                <CartesianGrid vertical={false} strokeOpacity={0.3} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis hide />
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
          </ChartCard>

          <ChartCard title="Commandes par jour">
            <ChartContainer config={ordersConfig} className="w-full">
              <BarChart data={data.revenueSeries} margin={chartMargin}>
                <CartesianGrid vertical={false} strokeOpacity={0.3} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="orders" fill="var(--color-orders)" radius={4} />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard title="Meilleures ventes">
            <ChartContainer config={itemsConfig} className="w-full">
              <BarChart data={data.topItems} layout="vertical" margin={{ ...chartMargin, left: 16 }}>
                <CartesianGrid horizontal={false} strokeOpacity={0.3} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={110}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <ChartCard title="Sur place vs livraison">
              <ChartContainer config={typeConfig} className="mx-auto aspect-square max-h-56">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={[
                      { key: "dine_in", value: data.typeSplit.dine_in },
                      { key: "delivery", value: data.typeSplit.delivery },
                    ]}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={50}
                  >
                    <Cell fill="var(--color-dine_in)" />
                    <Cell fill="var(--color-delivery)" />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </ChartCard>

            <ChartCard title="Nouveaux vs récurrents">
              <ChartContainer config={returningConfig} className="mx-auto aspect-square max-h-56">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={[
                      { key: "new", value: data.newVsReturning.new },
                      { key: "returning", value: data.newVsReturning.returning },
                    ]}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={50}
                  >
                    <Cell fill="var(--color-new)" />
                    <Cell fill="var(--color-returning)" />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </ChartCard>
          </div>

          <ChartCard title="Commandes par heure">
            <ChartContainer config={ordersConfig} className="w-full">
              <BarChart data={data.byHour} margin={chartMargin}>
                <CartesianGrid vertical={false} strokeOpacity={0.3} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="orders" fill="var(--color-orders)" radius={4} />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </Card>
  );
}
