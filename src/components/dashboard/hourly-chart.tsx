"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import { chartMargin, axisTick, primaryChartConfig } from "@/components/dashboard/chart-theme";

const TICKS = [0, 4, 8, 12, 16, 20];

function HourlyTooltip({ active, payload, label }: TooltipContentProps) {
  const t = useTranslations("HourlyChart");
  if (!active || !payload?.length) return null;
  const orders = Number(payload[0].value);
  return (
    <div className="rounded-xl border bg-card px-3 py-2 text-xs shadow-md">
      <span className="font-medium tabular-nums">{label}h</span>
      <span className="text-muted-foreground">
        {" "}
        · {t("orderCount", { count: orders })}
      </span>
    </div>
  );
}

export function HourlyChart({ data }: { data: { hour: number; orders: number }[] }) {
  const t = useTranslations("HourlyChart");
  const total = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
      <h2 className="text-sm font-medium text-muted-foreground">{t("title")}</h2>
      {total === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={Clock}
            title={t("empty")}
            hint={t("emptyHint")}
          />
        </div>
      ) : (
        <ChartContainer config={primaryChartConfig} className="mt-3 h-56 w-full md:h-64">
          <AreaChart data={data} margin={chartMargin}>
            <defs>
              <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.3} />
            <XAxis
              dataKey="hour"
              ticks={TICKS}
              tickFormatter={(h) => `${h}h`}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
            />
            <YAxis hide />
            <Tooltip content={(props) => <HourlyTooltip {...props} />} cursor={{ stroke: "hsl(var(--border))" }} />
            <Area
              dataKey="orders"
              type="monotone"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              fill="url(#hourlyGradient)"
              isAnimationActive
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
