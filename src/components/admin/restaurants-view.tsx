"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PlanBadge } from "@/components/admin/badges";
import { CreateRestaurantDialog } from "@/components/admin/create-restaurant-dialog";
import { RestaurantDetailPanel } from "@/components/admin/restaurant-detail-panel";
import { formatPrice, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminRestaurantRow, Plan } from "@/lib/types";

type Filters = { plan: string; status: string; city: string; q: string };

type RestaurantsSummary = { total: number; active: number; issues: number; monthlyRevenue: number };

async function fetchRestaurants(filters: Filters, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (filters.plan !== "all") params.set("plan", filters.plan);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.city) params.set("city", filters.city);
  if (filters.q) params.set("q", filters.q);

  const res = await fetch(`/api/admin/restaurants?${params}`);
  if (!res.ok) throw new Error("fetch failed");
  return res.json() as Promise<{
    restaurants: AdminRestaurantRow[];
    total: number;
    page: number;
    limit: number;
    summary: RestaurantsSummary;
  }>;
}

const PLAN_AVATAR_CLASS: Record<Plan, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  enterprise: "bg-primary/10 text-primary",
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

export function RestaurantsView() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ plan: "all", status: "all", city: "", q: "" });
  const [page, setPage] = useState(1);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["admin-restaurants", filters, page],
    queryFn: () => fetchRestaurants(filters, page),
  });

  function openPanel(id: string) {
    setPanelId(id);
    setPanelOpen(true);
  }

  async function quickSuspend(id: string, currentStatus: string) {
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    const res = await fetch(`/api/admin/restaurants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      toast.error("Mise à jour impossible");
      return;
    }
    toast.success(nextStatus === "suspended" ? "Restaurant suspendu" : "Restaurant réactivé");
    queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Restaurants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} restaurant${data.total > 1 ? "s" : ""}` : "…"}
          </p>
        </div>
        <CreateRestaurantDialog
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] })}
        />
      </div>

      {/* Summary strip — platform-wide, unaffected by filters (see route) */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[12px] font-bold text-muted-foreground">Restaurants</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight">{data?.summary.total ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-bold text-muted-foreground">Actifs</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {data?.summary.active ?? "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-bold text-muted-foreground">Expirés / suspendus</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-destructive">
            {data?.summary.issues ?? "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-bold text-muted-foreground">Revenu total (mois)</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-primary">
            {data ? formatPrice(data.summary.monthlyRevenue) : "—"}
          </p>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Recherche (nom, slug)"
          value={filters.q}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, q: e.target.value }));
          }}
          className="w-56"
        />
        <Input
          placeholder="Ville"
          value={filters.city}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, city: e.target.value }));
          }}
          className="w-40"
        />
        <Select
          value={filters.plan}
          onValueChange={(v) => {
            setPage(1);
            setFilters((f) => ({ ...f, plan: v }));
          }}
        >
          <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(v) => {
            setPage(1);
            setFilters((f) => ({ ...f, status: v }));
          }}
        >
          <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="trial">Essai</SelectItem>
            <SelectItem value="suspended">Suspendu</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        {isPending || !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.restaurants.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucun restaurant.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Revenu (mois)</TableHead>
                <TableHead>Commandes (mois)</TableHead>
                <TableHead>Dernière activité</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-[9px] text-[11.5px] font-extrabold",
                          PLAN_AVATAR_CLASS[r.plan],
                        )}
                      >
                        {initialsOf(r.name)}
                      </div>
                      <div>
                        <p className="font-bold">{r.name}</p>
                        <p className="text-[11.5px] text-muted-foreground">/{r.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{r.city ?? "—"}</TableCell>
                  <TableCell><PlanBadge plan={r.plan} /></TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="tabular-nums">{formatPrice(r.monthlyRevenue, r.currency)}</TableCell>
                  <TableCell className="tabular-nums">{r.monthlyOrders}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.ownerLastActiveAt ? formatDateTime(r.ownerLastActiveAt) : "—"}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => openPanel(r.id)}>
                        Voir
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/restaurants/${r.id}/site`}>Site</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => quickSuspend(r.id, r.status)}
                      >
                        {r.status === "suspended" ? "Réactiver" : "Suspendre"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      <RestaurantDetailPanel restaurantId={panelId} open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
}
