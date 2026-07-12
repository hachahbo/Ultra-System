import type { ChartConfig } from "@/components/ui/chart";

// Shared margins/ticks for every recharts usage in the dashboard
// (Aperçu hourly chart, sparklines, Statistiques). Consistency > cleverness —
// don't introduce a second style; conform new charts to this one.
export const chartMargin = { top: 8, right: 8, bottom: 8, left: 0 };

export const axisTick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export const primaryChartConfig: ChartConfig = {
  value: {
    label: "Commandes",
    color: "hsl(var(--primary))",
  },
};
