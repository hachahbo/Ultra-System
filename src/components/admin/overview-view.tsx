"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ChevronRight,
  CornerDownRight,
  Inbox,
  TrendingDown,
  TrendingUp,
  Users,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PLAN_COLOR_CLASS } from "@/components/admin/badges";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { initialsOf } from "@/lib/avatar";
import { formatPrice, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";

type AdminAnalytics = {
  restaurantCount: number;
  activeSubscriptions: number;
  mrr: number;
  totalOrders: number;
  totalRevenue: number;
  revenueSeries: { date: string; revenue: number; orders: number }[];
  expiringTrials: { restaurantId: string; restaurantName: string; trialEndsAt: string }[];
  mrrGrowthPct: number | null;
  arpu: number;
  churnRatePct: number;
  pendingRevenue: number;
  failedPaymentsCount: number;
  dau: number;
  mau: number;
  stickinessPct: number;
  atRiskCount: number;
  planDistribution: { plan: Plan; label: string; count: number; pct: number }[];
  acquisitionWeekly: { weekLabel: string; new: number; lost: number }[];
  recentSignups: {
    id: string;
    name: string;
    city: string | null;
    createdAt: string;
    onboardingStep: "onboarding" | "menu" | "active";
  }[];
  atRiskAccounts: { id: string; name: string; reason: string; severity: "high" | "mid" }[];
  franchiseTree: {
    id: string;
    name: string;
    plan: Plan;
    mrr: number;
    orders30d: number;
    branches: { id: string; name: string; plan: Plan; mrr: number; orders30d: number }[];
  }[];
};

async function fetchAnalytics(): Promise<AdminAnalytics> {
  const res = await fetch("/api/admin/analytics");
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

const revenueConfig: ChartConfig = {
  revenue: { label: "Revenu", color: "var(--chart-1)" },
};
const acquisitionConfig: ChartConfig = {
  new: { label: "Nouveaux", color: "var(--chart-2)" },
  lost: { label: "Perdus", color: "var(--chart-5)" },
};

const planColors: Record<Plan, string> = {
  free: "var(--chart-3)",
  pro: "var(--chart-1)",
  enterprise: "var(--chart-2)",
};

const ONBOARDING_LABEL: Record<AdminAnalytics["recentSignups"][number]["onboardingStep"], string> = {
  onboarding: "Onboarding",
  menu: "Menu en cours",
  active: "Actif",
};
const ONBOARDING_CLASS: Record<AdminAnalytics["recentSignups"][number]["onboardingStep"], string> = {
  onboarding: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  menu: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function ChartEmpty({ message }: { message: string }) {
  return (
    <Empty className="mt-4 border-0 p-0 py-8">
      <EmptyMedia variant="icon">
        <Inbox />
      </EmptyMedia>
      <EmptyDescription>{message}</EmptyDescription>
    </Empty>
  );
}

export function OverviewView() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: fetchAnalytics,
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
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

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Vue d&apos;ensemble</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Toutes les données ci-dessous agrègent l&apos;ensemble des restaurants.
      </p>

      {data.expiringTrials.length > 0 && (
        <Alert className="mt-4 border-amber-500/30 text-amber-700 dark:text-amber-400">
          <AlertTriangle />
          <AlertTitle>
            {data.expiringTrials.length} essai
            {data.expiringTrials.length > 1 ? "s" : ""} expirant sous 7 jours
          </AlertTitle>
          <AlertDescription className="text-amber-700/80 dark:text-amber-400/80">
            {data.expiringTrials
              .map((t) => `${t.restaurantName} (${formatDateTime(t.trialEndsAt)})`)
              .join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Financial KPI row */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FinancialKpi
          icon={TrendingUp}
          tone="orange"
          label="Croissance MRR"
          value={data.mrrGrowthPct === null ? "—" : formatPrice(data.mrr)}
          delta={
            data.mrrGrowthPct === null
              ? undefined
              : { text: `${data.mrrGrowthPct >= 0 ? "▲" : "▼"} ${Math.abs(data.mrrGrowthPct).toFixed(1)}%`, up: data.mrrGrowthPct >= 0 }
          }
        />
        <FinancialKpi icon={Wallet} tone="blue" label="ARPU" value={formatPrice(data.arpu)} />
        <FinancialKpi
          icon={TrendingDown}
          tone="green"
          label="Taux de désabonnement"
          value={`${data.churnRatePct.toFixed(1)}%`}
          delta={data.churnRatePct > 5 ? { text: "Élevé", up: false } : undefined}
        />
        <FinancialKpi
          icon={AlertTriangle}
          tone="red"
          label="Revenu en attente"
          value={formatPrice(data.pendingRevenue)}
          valueClassName={data.failedPaymentsCount > 0 ? "text-destructive" : undefined}
          delta={
            data.failedPaymentsCount > 0
              ? { text: `${data.failedPaymentsCount} échec${data.failedPaymentsCount > 1 ? "s" : ""}`, up: false }
              : undefined
          }
        />
      </div>

      {/* Platform health row */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HealthKpi icon={UserCheck} tone="orange" label="DAU (staff connectés)" value={String(data.dau)} />
        <HealthKpi icon={Users} tone="blue" label="MAU" value={String(data.mau)} />
        <HealthKpi icon={TrendingUp} tone="green" label="Stickiness (DAU/MAU)" value={`${data.stickinessPct.toFixed(0)}%`} />
        <HealthKpi
          icon={AlertTriangle}
          tone="amber"
          label="Comptes à risque"
          value={String(data.atRiskCount)}
          valueClassName={data.atRiskCount > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
        />
      </div>

      {/* Charts row 1: revenue + plan donut */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <p className="text-sm font-medium">Revenu — 30 derniers jours</p>
          {data.revenueSeries.length === 0 ? (
            <ChartEmpty message="Aucune commande sur la période." />
          ) : (
            <ChartContainer config={revenueConfig} className="mt-4 h-56 w-full">
              <AreaChart data={data.revenueSeries}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => v.slice(5)} />
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
          {data.planDistribution.length === 0 ? (
            <ChartEmpty message="Aucun restaurant." />
          ) : (
            <div className="mt-4 flex items-center gap-5">
              <ChartContainer config={revenueConfig} className="aspect-square h-32 shrink-0">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={data.planDistribution} dataKey="count" nameKey="label" innerRadius={38} outerRadius={56}>
                    {data.planDistribution.map((entry) => (
                      <Cell key={entry.plan} fill={planColors[entry.plan]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex flex-col gap-3">
                {data.planDistribution.map((p) => (
                  <div key={p.plan}>
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-[3px]" style={{ background: planColors[p.plan] }} />
                      <span className="text-[12.5px] font-bold text-muted-foreground">{p.label}</span>
                    </div>
                    <div className="ml-4.5 mt-0.5 text-[15px] font-extrabold">
                      {p.pct}% <span className="text-[11.5px] font-semibold text-muted-foreground">· {p.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Charts row 2: acquisition vs churn */}
      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Acquisition vs. Désabonnement</p>
          <div className="flex gap-4 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: "var(--chart-2)" }} />
              Nouveaux
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: "var(--chart-5)" }} />
              Perdus
            </span>
          </div>
        </div>
        {data.acquisitionWeekly.length === 0 ? (
          <ChartEmpty message="Pas assez de données sur la période." />
        ) : (
          <ChartContainer config={acquisitionConfig} className="mt-4 h-40 w-full">
            <BarChart data={data.acquisitionWeekly} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.15} />
              <XAxis dataKey="weekLabel" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <Bar dataKey="new" fill="var(--color-new)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="lost" fill="var(--color-lost)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </Card>

      {/* Operational tables */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm font-medium">Dernières inscriptions</p>
          {data.recentSignups.length === 0 ? (
            <ChartEmpty message="Aucune inscription récente." />
          ) : (
            <Table className="mt-2">
              <TableBody>
                {data.recentSignups.map((s) => (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="w-9 p-2 pl-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-[12.5px] font-extrabold text-primary">
                        {initialsOf(s.name)}
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <p className="text-[13.5px] font-bold">{s.name}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {s.city ?? "—"} · {formatDateTime(s.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell className="p-2 pr-0 text-right">
                      <Badge className={cn("rounded-full font-bold", ONBOARDING_CLASS[s.onboardingStep])}>
                        {ONBOARDING_LABEL[s.onboardingStep]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <p className="text-sm font-medium">Comptes à risque</p>
          </div>
          {data.atRiskAccounts.length === 0 ? (
            <ChartEmpty message="Aucun compte à risque." />
          ) : (
            <Table className="mt-2">
              <TableBody>
                {data.atRiskAccounts.map((a) => (
                  <TableRow key={a.id} className="border-border">
                    <TableCell className="w-3 p-2 pl-0">
                      <span className={cn("size-2 shrink-0 rounded-full", a.severity === "high" ? "bg-destructive" : "bg-amber-500")} />
                    </TableCell>
                    <TableCell className="p-2">
                      <p className="text-[13.5px] font-bold">{a.name}</p>
                      <p className={cn("text-[11.5px]", a.severity === "high" ? "text-destructive" : "text-amber-600 dark:text-amber-400")}>
                        {a.reason}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Franchises & groupes */}
      <FranchiseTree data={data.franchiseTree} />

      {/* Core Web Vitals (RUM, ROADMAP-PHASE7.md Task 7.4.3) */}
      <CoreWebVitals />
    </div>
  );
}

type WebVitalRow = {
  surface: string;
  metric_name: "CLS" | "LCP" | "INP" | "FCP" | "TTFB";
  p75: number;
  sample_count: number;
  good_rate: number;
};

const VITAL_UNIT: Record<WebVitalRow["metric_name"], "ms" | ""> = {
  CLS: "",
  LCP: "ms",
  INP: "ms",
  FCP: "ms",
  TTFB: "ms",
};

const SURFACE_LABEL: Record<string, string> = {
  storefront: "Site public",
  dashboard: "Dashboard",
  admin: "Super admin",
  other: "Autre",
};

async function fetchVitals(): Promise<WebVitalRow[]> {
  const res = await fetch("/api/admin/analytics/vitals?days=7");
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.vitals ?? [];
}

function CoreWebVitals() {
  const { data, isPending } = useQuery({
    queryKey: ["admin-web-vitals"],
    queryFn: fetchVitals,
  });

  const bySurface = new Map<string, WebVitalRow[]>();
  for (const row of data ?? []) {
    const list = bySurface.get(row.surface) ?? [];
    list.push(row);
    bySurface.set(row.surface, list);
  }

  return (
    <Card className="p-4">
      <p className="text-sm font-medium">Core Web Vitals — P75, 7 derniers jours</p>
      {isPending ? (
        <Skeleton className="mt-3 h-16 w-full rounded-xl" />
      ) : bySurface.size === 0 ? (
        <ChartEmpty message="Pas encore de données de performance réelle." />
      ) : (
        <div className="mt-3 space-y-2">
          {[...bySurface.entries()].map(([surface, rows]) => (
            <div key={surface} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
              <span className="w-24 shrink-0 font-bold text-foreground">{SURFACE_LABEL[surface] ?? surface}</span>
              {rows.map((r) => (
                <span key={r.metric_name} className="flex items-center gap-1 text-muted-foreground">
                  <span className="font-semibold text-foreground">{r.metric_name}</span>
                  {r.metric_name === "CLS" ? r.p75.toFixed(2) : `${Math.round(r.p75)}${VITAL_UNIT[r.metric_name]}`}
                  <span className={r.good_rate >= 0.75 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                    ({Math.round(r.good_rate * 100)}% bon)
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const KPI_TONE_CLASS: Record<"orange" | "blue" | "green" | "red" | "amber", { bg: string; text: string }> = {
  orange: { bg: "bg-primary/10", text: "text-primary" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  red: { bg: "bg-destructive/10", text: "text-destructive" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
};

function FinancialKpi({
  icon: Icon,
  tone,
  label,
  value,
  valueClassName,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof KPI_TONE_CLASS;
  label: string;
  value: string;
  valueClassName?: string;
  delta?: { text: string; up: boolean };
}) {
  const toneClass = KPI_TONE_CLASS[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className={cn("flex size-8 items-center justify-center rounded-[9px]", toneClass.bg, toneClass.text)}>
          <Icon className="size-4" />
        </div>
        {delta && (
          <Badge
            className={cn(
              "rounded-[7px] font-bold",
              delta.up
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {delta.text}
          </Badge>
        )}
      </div>
      <p className={cn("mt-3.5 text-2xl font-extrabold tracking-tight", valueClassName)}>{value}</p>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">{label}</p>
    </Card>
  );
}

function HealthKpi({
  icon: Icon,
  tone,
  label,
  value,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof KPI_TONE_CLASS;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  const toneClass = KPI_TONE_CLASS[tone];
  return (
    <Card className="flex-row items-center gap-3.5 p-4">
      <div className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[9px]", toneClass.bg, toneClass.text)}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className={cn("text-[19px] font-extrabold tracking-tight", valueClassName)}>{value}</p>
        <p className="text-[12px] text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function FranchiseTree({ data }: { data: AdminAnalytics["franchiseTree"] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.map((p) => [p.id, true])),
  );

  return (
    <Card className="mt-4 p-4">
      <p className="text-sm font-medium">Franchises &amp; groupes</p>
      {data.length === 0 ? (
        <Empty className="mt-2 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>Aucune franchise reliée</EmptyTitle>
            <EmptyDescription>
              Reliez un restaurant à un compte parent pour le voir apparaître ici.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className="mt-2">
          <TableHeader>
            <TableRow>
              <TableHead>Compte</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead className="text-right">Commandes 30j</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((parent) => {
              const isOpen = open[parent.id] ?? true;
              return (
                // Radix Collapsible's Root/Content assume trigger+content are
                // one contiguous subtree — that doesn't fit two independent
                // <TableRow> groups sharing toggle state, so this stays a
                // plain accessible button (aria-expanded) over local state
                // rather than forcing the primitive to fit.
                <Fragment key={parent.id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Réduire" : "Développer"}
                          onClick={() => setOpen((s) => ({ ...s, [parent.id]: !isOpen }))}
                          className="flex size-[18px] shrink-0 items-center justify-center text-muted-foreground"
                        >
                          <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} />
                        </button>
                        <span className="text-[13.5px] font-extrabold">{parent.name}</span>
                        <Badge variant="secondary" className="rounded-full font-bold">
                          {parent.branches.length} sites
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-full font-bold", PLAN_COLOR_CLASS[parent.plan].bg, PLAN_COLOR_CLASS[parent.plan].text)}>{parent.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatPrice(parent.mrr)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{parent.orders30d}</TableCell>
                  </TableRow>
                  {isOpen &&
                    parent.branches.map((b) => (
                      <TableRow key={b.id} className="border-border/60">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="size-3.5 text-muted-foreground/50" />
                            <span className="text-[13.5px] font-semibold text-muted-foreground">{b.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("rounded-full font-bold", PLAN_COLOR_CLASS[b.plan].bg, PLAN_COLOR_CLASS[b.plan].text)}>{b.plan}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-muted-foreground">{formatPrice(b.mrr)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{b.orders30d}</TableCell>
                      </TableRow>
                    ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
