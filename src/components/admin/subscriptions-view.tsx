"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Inbox, MoreVertical, ShieldOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanBadge } from "@/components/admin/badges";
import { SubscriptionEditDialog } from "@/components/admin/subscription-edit-dialog";
import { formatPrice, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Subscription } from "@/lib/types";

type SubscriptionRow = Subscription & {
  restaurant: { id: string; name: string; slug: string; currency: string; status: string } | null;
};

async function fetchSubscriptions(): Promise<SubscriptionRow[]> {
  const res = await fetch("/api/admin/subscriptions");
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.subscriptions;
}

const STATUS_FILTERS: { value: Subscription["status"] | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actif" },
  { value: "trialing", label: "Essai" },
  { value: "past_due", label: "Impayé" },
  { value: "canceled", label: "Annulé" },
];

const STATUS_LABELS: Record<Subscription["status"], string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Impayé",
  canceled: "Annulé",
};

const STATUS_BADGE_CLASS: Record<Subscription["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  trialing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  past_due: "bg-destructive/10 text-destructive",
  canceled: "bg-muted text-muted-foreground",
};

const STATUS_DOT_CLASS: Record<Subscription["status"], string> = {
  active: "bg-emerald-500",
  trialing: "bg-amber-500",
  past_due: "bg-destructive",
  canceled: "bg-muted-foreground",
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function monthlyPrice(priceMad: number, billingCycle: string): number {
  return billingCycle === "yearly" ? priceMad / 12 : priceMad;
}

function renewalDate(s: Subscription): string | null {
  return s.trial_ends_at ?? s.current_period_end;
}

function Countdown({ iso }: { iso: string }) {
  const days = Math.round((new Date(iso).getTime() - new Date().getTime()) / 86_400_000);
  if (days < 0) {
    return <p className="mt-0.5 text-[11px] font-bold text-destructive">En retard de {Math.abs(days)} j</p>;
  }
  if (days <= 14) {
    return <p className="mt-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">Dans {days} j</p>;
  }
  return <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">Dans {days} j</p>;
}

export function SubscriptionsView() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: fetchSubscriptions,
  });
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  const [filter, setFilter] = useState<Subscription["status"] | "all">("all");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });

  async function quickPatch(restaurantId: string, patch: Record<string, unknown>, successMessage: string) {
    const res = await fetch(`/api/admin/subscriptions/${restaurantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Mise à jour impossible");
      return;
    }
    toast.success(successMessage);
    refresh();
  }

  const filtered = useMemo(
    () => (data ?? []).filter((s) => filter === "all" || s.status === filter),
    [data, filter],
  );

  const summary = useMemo(() => {
    const rows = data ?? [];
    const active = rows.filter((s) => s.status === "active");
    const pastDue = rows.filter((s) => s.status === "past_due");
    const canceled = rows.filter((s) => s.status === "canceled");
    const mrr = [...active, ...rows.filter((s) => s.status === "trialing")].reduce(
      (sum, s) => sum + monthlyPrice(Number(s.price_mad), s.billing_cycle),
      0,
    );
    const pastDueAmount = pastDue.reduce(
      (sum, s) => sum + monthlyPrice(Number(s.price_mad), s.billing_cycle),
      0,
    );
    return {
      mrr,
      activeCount: active.length,
      total: rows.length,
      pastDueCount: pastDue.length,
      pastDueAmount,
      canceledCount: canceled.length,
    };
  }, [data]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Abonnements</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Facturation manuelle — changer de plan, prolonger un essai ou marquer un paiement reçu.
      </p>

      {/* Summary strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[12px] font-bold text-muted-foreground">MRR estimé</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-primary">{formatPrice(summary.mrr)}</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">abonnements actifs</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-bold text-muted-foreground">Actifs</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {summary.activeCount}
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">sur {summary.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-bold text-muted-foreground">Impayés</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-destructive">{summary.pastDueCount}</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {formatPrice(summary.pastDueAmount)} en attente
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-bold text-muted-foreground">Annulés</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-muted-foreground">
            {summary.canceledCount}
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">ce mois</p>
        </Card>
      </div>

      {/* Filter chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold transition-colors",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        {isPending || !data ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty className="border-0 py-12">
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyDescription>Aucun abonnement ne correspond à ce filtre.</EmptyDescription>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead>Renouvellement</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const name = s.restaurant?.name ?? "—";
                const renewal = renewalDate(s);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary/10 text-[11.5px] font-extrabold text-primary">
                          {initialsOf(name)}
                        </div>
                        <span className="font-bold">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlanBadge plan={s.plan_tier} />
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("gap-1.5 rounded-full font-bold", STATUS_BADGE_CLASS[s.status])}>
                        <span className={cn("size-1.5 rounded-full", STATUS_DOT_CLASS[s.status])} />
                        {STATUS_LABELS[s.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.billing_cycle === "yearly" ? "Annuel" : "Mensuel"}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatPrice(s.price_mad, s.restaurant?.currency ?? "MAD")}
                    </TableCell>
                    <TableCell>
                      {renewal ? (
                        <>
                          <p className="text-muted-foreground">{formatDateTime(renewal)}</p>
                          <Countdown iso={renewal} />
                        </>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">
                      {s.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions pour ${name}`}>
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => setEditing(s)} className="gap-2.5">
                            <MoreVertical className="size-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              quickPatch(
                                s.restaurant_id,
                                {
                                  status: "trialing",
                                  trial_ends_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
                                },
                                "Essai prolongé de 14 jours",
                              )
                            }
                            className="gap-2.5"
                          >
                            <Clock className="size-4" />
                            Prolonger l&apos;essai (+14 j)
                          </DropdownMenuItem>
                          {s.status !== "active" && (
                            <DropdownMenuItem
                              onClick={() =>
                                quickPatch(
                                  s.restaurant_id,
                                  { status: "active", notes: "Paiement reçu — marqué manuellement" },
                                  "Marqué comme payé",
                                )
                              }
                              className="gap-2.5 text-emerald-600 focus:text-emerald-600 dark:text-emerald-400"
                            >
                              <CheckCircle2 className="size-4" />
                              Marquer comme payé
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {s.status !== "past_due" && s.status !== "canceled" && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                quickPatch(
                                  s.restaurant_id,
                                  { status: "past_due", notes: "Suspendu manuellement" },
                                  "Abonnement suspendu",
                                )
                              }
                              className="gap-2.5"
                            >
                              <ShieldOff className="size-4" />
                              Suspendre l&apos;abonnement
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {editing && (
        <SubscriptionEditDialog
          subscription={editing}
          restaurantName={editing.restaurant?.name ?? "—"}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
