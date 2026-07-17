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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPrice } from "@/lib/format";
import { FadeUp } from "@/components/dashboard/motion";
import { cn } from "@/lib/utils";

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
  revenue: { label: "Revenu", color: "#4ec27f" },
};
const ordersConfig: ChartConfig = {
  orders: { label: "Commandes", color: "#ec5b1a" },
};
const hourConfig: ChartConfig = {
  orders: { label: "Commandes", color: "#7c8cff" },
};

function KpiCard({
  label,
  value,
  delta,
  arrow,
  color = "#fff",
  deltaType = "up",
}: {
  label: string;
  value: string;
  delta: string;
  arrow: string;
  color?: string;
  deltaType?: "up" | "down";
}) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-border/50 dark:border-[#232323] rounded-[16px] p-[17px_19px] shadow-sm flex flex-col">
      <div className="text-[12px] font-bold text-muted-foreground dark:text-[#8b8b93]">{label}</div>
      <div className="text-[27px] font-extrabold tracking-[-0.7px] mt-2 text-foreground dark:text-white" style={{ color: color === "#fff" ? undefined : color }}>{value}</div>
      <div className="flex items-center gap-1.5 mt-auto pt-2">
        <span 
          className={cn(
            "text-[11.5px] font-bold px-2 py-0.5 rounded-[6px]",
            deltaType === "up" 
              ? "text-emerald-600 dark:text-[#4ec27f] bg-emerald-500/15 dark:bg-[#4ec27f]/15" 
              : "text-red-600 dark:text-[#e0574a] bg-red-500/15 dark:bg-[#e0574a]/15"
          )}
        >
          {arrow} {delta}
        </span>
        <span className="text-[11.5px] text-muted-foreground dark:text-[#6a6a72]">vs période préc.</span>
      </div>
    </div>
  );
}

export function AnalyticsView({ currency = "MAD" }: { currency?: string }) {
  const [range, setRange] = useState<Range>("30d");
  const { data, isPending } = useQuery({
    queryKey: ["analytics", range],
    queryFn: () => fetchAnalytics(range),
  });

  const totalRevenue = data?.revenueSeries.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalOrders = data?.revenueSeries.reduce((s, d) => s + d.orders, 0) ?? 0;
  const avgBasket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Mock delta for UI
  const deltaRevenue = "12,4%";
  const deltaOrders = "8,1%";
  const deltaBasket = "3,9%";
  const deltaCancel = "0,6%"; // Mock

  const topItems = data?.topItems ?? [];
  const bestSellers = topItems.slice(0, 5);
  // Just reverse for worst sellers mock
  const worstSellers = [...topItems].reverse().slice(0, 5);

  const channelTotal = (data?.typeSplit.dine_in ?? 0) + (data?.typeSplit.delivery ?? 0);
  const dineInPct = channelTotal > 0 ? Math.round(((data?.typeSplit.dine_in ?? 0) / channelTotal) * 100) : 0;
  const deliveryPct = channelTotal > 0 ? Math.round(((data?.typeSplit.delivery ?? 0) / channelTotal) * 100) : 0;

  const customerTotal = (data?.newVsReturning.new ?? 0) + (data?.newVsReturning.returning ?? 0);
  const newPct = customerTotal > 0 ? Math.round(((data?.newVsReturning.new ?? 0) / customerTotal) * 100) : 0;
  const returningPct = customerTotal > 0 ? Math.round(((data?.newVsReturning.returning ?? 0) / customerTotal) * 100) : 0;

  return (
    <div className="w-full min-h-[1020px] bg-[#f7f2ea] dark:bg-[#0a0a0a] rounded-[22px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.08)] dark:shadow-none border border-[#ece6dc] dark:border-white/10 text-[#1c1712] dark:text-white p-6 md:p-8 lg:px-[34px] lg:pt-[28px] lg:pb-[40px] relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-[22px]">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.5px] m-0">Statistiques</h1>
          <div className="text-[13.5px] text-muted-foreground dark:text-[#8b8b93] mt-1">
            Performance de votre restaurant · {range === "7d" ? "7" : range === "30d" ? "30" : "90"} derniers jours
          </div>
        </div>
        <div className="flex gap-2 bg-white dark:bg-[#111111] border border-border/50 dark:border-[#232323] rounded-[12px] p-1 shadow-sm">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-[15px] py-[7px] rounded-[9px] text-[12.5px] font-bold transition-colors",
                range === r
                  ? "bg-[#ec5b1a] text-white shadow-sm"
                  : "text-muted-foreground dark:text-[#8b8b93] hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              {r.replace("d", "j")}
            </button>
          ))}
        </div>
      </div>

      {isPending || !data ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-[20px]">
          {/* 1. KPI ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
            <FadeUp delay={0}>
              <KpiCard 
                label="Revenu total" 
                value={formatPrice(totalRevenue, currency)} 
                delta={deltaRevenue} 
                arrow="▲" 
              />
            </FadeUp>
            <FadeUp delay={0.04}>
              <KpiCard 
                label="Commandes" 
                value={totalOrders.toString()} 
                delta={deltaOrders} 
                arrow="▲" 
              />
            </FadeUp>
            <FadeUp delay={0.08}>
              <KpiCard 
                label="Panier moyen" 
                value={formatPrice(avgBasket, currency)} 
                delta={deltaBasket} 
                arrow="▲" 
              />
            </FadeUp>
            <FadeUp delay={0.12}>
              <KpiCard 
                label="Taux d'annulation" 
                value="2,3%" 
                delta={deltaCancel} 
                arrow="▼" 
                deltaType="down" 
              />
            </FadeUp>
          </div>

          {/* 2. MAIN TRENDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
            <FadeUp delay={0.16}>
              <div className="bg-white dark:bg-[#111111] border border-border/50 dark:border-[#232323] rounded-[18px] p-[20px] shadow-sm h-full flex flex-col">
                <div className="flex items-baseline justify-between mb-[6px]">
                  <div className="text-[14px] font-extrabold">Revenu</div>
                  <div className="text-[13px] font-bold text-emerald-500 dark:text-[#4ec27f]">
                    {formatPrice(totalRevenue, currency)} <span className="text-muted-foreground dark:text-[#6a6a72] font-semibold">total</span>
                  </div>
                </div>
                <div className="text-[11.5px] text-muted-foreground dark:text-[#8b8b93] mb-[14px]">
                  Chiffre d'affaires quotidien
                </div>
                <div className="flex-1 min-h-[150px]">
                  <ChartContainer config={revenueConfig} className="w-full h-full">
                    <AreaChart data={data.revenueSeries} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4ec27f" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#4ec27f" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeOpacity={0.15} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.substring(5)} />
                      <YAxis hide />
                      <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
                      <Area
                        dataKey="revenue"
                        type="monotone"
                        fill="url(#fillRevenue)"
                        stroke="#4ec27f"
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.20}>
              <div className="bg-white dark:bg-[#111111] border border-border/50 dark:border-[#232323] rounded-[18px] p-[20px] shadow-sm h-full flex flex-col">
                <div className="flex items-baseline justify-between mb-[6px]">
                  <div className="text-[14px] font-extrabold">Commandes par jour</div>
                  <div className="text-[13px] font-bold text-[#ec5b1a]">
                    {totalOrders} <span className="text-muted-foreground dark:text-[#6a6a72] font-semibold">total</span>
                  </div>
                </div>
                <div className="text-[11.5px] text-muted-foreground dark:text-[#8b8b93] mb-[14px]">
                  Volume de commandes
                </div>
                <div className="flex-1 min-h-[150px]">
                  <ChartContainer config={ordersConfig} className="w-full h-full">
                    <BarChart data={data.revenueSeries} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                      <CartesianGrid vertical={false} strokeOpacity={0.15} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.substring(5)} />
                      <YAxis hide />
                      <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
                      <Bar dataKey="orders" fill="#ec5b1a" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </FadeUp>
          </div>

          {/* 3. OPERATIONAL BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px]">
            <FadeUp delay={0.24}>
              <div className="bg-white dark:bg-[#111111] border border-border/50 dark:border-[#232323] rounded-[18px] p-[20px] shadow-sm h-full flex flex-col">
                <div className="text-[14px] font-extrabold mb-[16px]">Sur place vs Livraison</div>
                <div className="flex items-center gap-[18px] flex-1">
                  <div className="relative w-[118px] h-[118px]">
                    <ChartContainer config={{}} className="w-full h-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={[
                            { name: "Sur place", value: data.typeSplit.dine_in, fill: "#ec5b1a" },
                            { name: "Livraison", value: data.typeSplit.delivery, fill: "#7c8cff" },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={40}
                          outerRadius={56}
                          strokeWidth={2}
                          stroke="transparent"
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[18px] font-extrabold">{channelTotal > 0 ? "100" : "0"}%</span>
                      <span className="text-[9px] font-semibold text-muted-foreground dark:text-[#8b8b93] uppercase mt-0.5 tracking-[1.2px]">TOTAL</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-[12px]">
                    <div>
                      <div className="flex items-center gap-[7px]">
                        <span className="w-[9px] h-[9px] rounded-[2px] bg-[#ec5b1a]"></span>
                        <span className="text-[12px] font-bold text-muted-foreground dark:text-[#c9c9d1]">Sur place</span>
                      </div>
                      <div className="text-[16px] font-extrabold mt-[2px] ml-[16px]">{dineInPct}%</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-[7px]">
                        <span className="w-[9px] h-[9px] rounded-[2px] bg-[#7c8cff]"></span>
                        <span className="text-[12px] font-bold text-muted-foreground dark:text-[#c9c9d1]">Livraison</span>
                      </div>
                      <div className="text-[16px] font-extrabold mt-[2px] ml-[16px]">{deliveryPct}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.28}>
              <div className="bg-white dark:bg-[#111111] border border-border/50 dark:border-[#232323] rounded-[18px] p-[20px] shadow-sm h-full flex flex-col">
                <div className="text-[14px] font-extrabold mb-[16px]">Nouveaux vs Récurrents</div>
                <div className="flex items-center gap-[18px] flex-1">
                  <div className="relative w-[118px] h-[118px]">
                    <ChartContainer config={{}} className="w-full h-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={[
                            { name: "Nouveaux", value: data.newVsReturning.new, fill: "#4ec27f" },
                            { name: "Récurrents", value: data.newVsReturning.returning, fill: "#e6a92f" },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={40}
                          outerRadius={56}
                          strokeWidth={2}
                          stroke="transparent"
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[18px] font-extrabold">{customerTotal > 0 ? "100" : "0"}%</span>
                      <span className="text-[9px] font-semibold text-muted-foreground dark:text-[#8b8b93] uppercase mt-0.5 tracking-[1.2px]">TOTAL</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-[12px]">
                    <div>
                      <div className="flex items-center gap-[7px]">
                        <span className="w-[9px] h-[9px] rounded-[2px] bg-[#4ec27f]"></span>
                        <span className="text-[12px] font-bold text-muted-foreground dark:text-[#c9c9d1]">Nouveaux</span>
                      </div>
                      <div className="text-[16px] font-extrabold mt-[2px] ml-[16px]">{newPct}%</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-[7px]">
                        <span className="w-[9px] h-[9px] rounded-[2px] bg-[#e6a92f]"></span>
                        <span className="text-[12px] font-bold text-muted-foreground dark:text-[#c9c9d1]">Récurrents</span>
                      </div>
                      <div className="text-[16px] font-extrabold mt-[2px] ml-[16px]">{returningPct}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.32}>
              <div className="bg-white dark:bg-[#111111] border border-border/50 dark:border-[#232323] rounded-[18px] p-[20px] shadow-sm h-full flex flex-col">
                <div className="text-[14px] font-extrabold mb-[4px]">Commandes par heure</div>
                <div className="text-[11.5px] text-muted-foreground dark:text-[#8b8b93] mb-[14px]">
                  Pic : 12h–14h & 19h–21h
                </div>
                <div className="flex-1 min-h-[120px]">
                  <ChartContainer config={hourConfig} className="w-full h-full">
                    <BarChart data={data.byHour} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                      <CartesianGrid vertical={false} strokeOpacity={0.15} />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${v}h`} />
                      <YAxis hide />
                      <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
                      <Bar dataKey="orders" fill="#7c8cff" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </FadeUp>
          </div>

          {/* 4. PRODUCT PERFORMANCE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
            <FadeUp delay={0.36}>
              <div className="bg-white dark:bg-[#111111] border border-border/50 dark:border-[#232323] rounded-[18px] p-[20px] shadow-sm h-full">
                <div className="flex items-center gap-[8px] mb-[16px]">
                  <span className="w-[8px] h-[8px] rounded-full bg-emerald-500 dark:bg-[#4ec27f]"></span>
                  <div className="text-[14px] font-extrabold">Meilleures ventes</div>
                </div>
                <div className="grid grid-cols-[22px_1fr_auto_auto] gap-y-[12px] gap-x-[14px] items-center">
                  {bestSellers.map((item, i) => (
                    <div key={i} className="contents">
                      <div className="text-[12px] font-extrabold text-emerald-500 dark:text-[#4ec27f]">#{i + 1}</div>
                      <div className="text-[13px] font-semibold text-foreground dark:text-[#e6e6ea] truncate">{item.name}</div>
                      <div className="text-[12.5px] text-muted-foreground dark:text-[#8b8b93] text-right">{item.quantity} vendus</div>
                      <div className="text-[13px] font-bold text-right min-w-[64px]">{formatPrice(item.revenue, currency)}</div>
                    </div>
                  ))}
                  {bestSellers.length === 0 && (
                    <div className="col-span-4 text-center text-sm text-muted-foreground py-4">Aucune donnée</div>
                  )}
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.40}>
              <div className="bg-white dark:bg-[#111111] border border-border/50 dark:border-[#232323] rounded-[18px] p-[20px] shadow-sm h-full">
                <div className="flex items-center gap-[8px] mb-[16px]">
                  <span className="w-[8px] h-[8px] rounded-full bg-red-500 dark:bg-[#e0574a]"></span>
                  <div className="text-[14px] font-extrabold">Pires ventes</div>
                  <span className="text-[11px] text-muted-foreground dark:text-[#8b8b93] ml-auto">À reconsidérer</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-y-[12px] gap-x-[14px] items-center">
                  {worstSellers.map((item, i) => (
                    <div key={i} className="contents">
                      <div className="text-[13px] font-semibold text-foreground dark:text-[#e6e6ea] truncate">{item.name}</div>
                      <div className="text-[12.5px] text-muted-foreground dark:text-[#8b8b93] text-right">{item.quantity} vendus</div>
                      <div className="text-[13px] font-bold text-right min-w-[64px] text-muted-foreground dark:text-[#9a9aa2]">{formatPrice(item.revenue, currency)}</div>
                    </div>
                  ))}
                  {worstSellers.length === 0 && (
                    <div className="col-span-3 text-center text-sm text-muted-foreground py-4">Aucune donnée</div>
                  )}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      )}
    </div>
  );
}
