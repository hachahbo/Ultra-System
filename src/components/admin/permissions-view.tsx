"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PLAN_COLOR_CLASS } from "@/components/admin/badges";
import { FEATURE_LABELS } from "@/lib/feature-labels";
import { initialsOf } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { FEATURE_KEYS, type FeatureKey, type Plan } from "@/lib/types";

type PermissionRestaurant = { id: string; name: string; plan: Plan; activeFeatures: FeatureKey[] };

async function fetchRestaurants(): Promise<PermissionRestaurant[]> {
  const res = await fetch("/api/admin/permissions");
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.restaurants;
}

// undefined = untouched, true = will enable, false = will disable.
type Staged = Partial<Record<FeatureKey, boolean>>;

function FeatureToggleCard({
  featureKey,
  state,
  onCycle,
}: {
  featureKey: FeatureKey;
  state: boolean | undefined;
  onCycle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCycle}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
        state === true && "border-primary/40 bg-primary/5",
        state === false && "border-destructive/40 bg-destructive/5",
        state === undefined && "border-border",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-[9px]",
          state === true
            ? "bg-primary/10 text-primary"
            : state === false
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
        )}
      >
        {state === true ? <Check className="size-4" /> : state === false ? <X className="size-4" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold">{FEATURE_LABELS[featureKey]}</p>
        <p className="text-[11px] text-muted-foreground">
          {state === true ? "Sera activé" : state === false ? "Sera désactivé" : "Inchangé"}
        </p>
      </div>
      <div
        className={cn(
          "h-[23px] w-10 shrink-0 rounded-full p-0.5 transition-colors",
          state === true ? "bg-primary" : state === false ? "bg-destructive/60" : "bg-muted",
        )}
      >
        <div
          className={cn(
            "size-[19px] rounded-full bg-white transition-transform",
            state === true && "translate-x-[17px]",
          )}
        />
      </div>
    </button>
  );
}

export function PermissionsView() {
  const queryClient = useQueryClient();
  const { data: restaurants, isPending } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: fetchRestaurants,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [staged, setStaged] = useState<Staged>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!restaurants) return;
    setSelected((prev) =>
      prev.size === restaurants.length ? new Set() : new Set(restaurants.map((r) => r.id)),
    );
  }

  // Cycle: untouched -> on -> off -> untouched.
  function cycleFeature(key: FeatureKey) {
    setStaged((prev) => {
      const cur = prev[key];
      const next = { ...prev };
      if (cur === undefined) next[key] = true;
      else if (cur === true) next[key] = false;
      else delete next[key];
      return next;
    });
  }

  const stagedKeys = Object.keys(staged) as FeatureKey[];
  const canApply = selected.size > 0 && stagedKeys.length > 0;

  async function applyBulk() {
    setSubmitting(true);
    const changes = stagedKeys.map((featureKey) => ({ featureKey, enabled: staged[featureKey]! }));
    const res = await fetch("/api/admin/permissions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantIds: [...selected], changes }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Mise à jour groupée impossible");
      return;
    }
    toast.success(
      `${changes.length} fonctionnalité${changes.length > 1 ? "s" : ""} appliquée${changes.length > 1 ? "s" : ""} sur ${selected.size} restaurant${selected.size > 1 ? "s" : ""}`,
    );
    setConfirmOpen(false);
    setStaged({});
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Permissions</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
        Sélectionnez des restaurants et une fonctionnalité pour appliquer un changement en masse.
        Pour les réglages fins par restaurant, ouvrez son panneau depuis la page Restaurants.
      </p>

      {selected.size > 0 && (
        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] font-bold">
              {selected.size} restaurant{selected.size > 1 ? "s" : ""} sélectionné
              {selected.size > 1 ? "s" : ""} — définir :
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setStaged(Object.fromEntries(FEATURE_KEYS.map((k) => [k, true])))}
              >
                Tout activer
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setStaged(Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])))}
              >
                Tout désactiver
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((key) => (
              <FeatureToggleCard
                key={key}
                featureKey={key}
                state={staged[key]}
                onCycle={() => cycleFeature(key)}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className={cn("text-[12.5px]", stagedKeys.length ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {stagedKeys.length
                ? `${stagedKeys.length} fonctionnalité${stagedKeys.length > 1 ? "s" : ""} en attente d'application`
                : "Cliquez sur une fonctionnalité pour préparer un changement."}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStaged({})} disabled={stagedKeys.length === 0}>
                Réinitialiser
              </Button>
              <Button type="button" size="sm" disabled={!canApply} onClick={() => setConfirmOpen(true)}>
                Appliquer
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border">
        {isPending || !restaurants ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={restaurants.length > 0 && selected.size === restaurants.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Fonctionnalités actives</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <TableRow key={r.id} className={cn(selected.has(r.id) && "bg-primary/[0.03]")}>
                  <TableCell>
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelected(r.id)} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-[9px] text-[11.5px] font-extrabold",
                          PLAN_COLOR_CLASS[r.plan].bg,
                          PLAN_COLOR_CLASS[r.plan].text,
                        )}
                      >
                        {initialsOf(r.name)}
                      </div>
                      <span className="font-bold">{r.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.plan}</TableCell>
                  <TableCell>
                    {r.activeFeatures.length === 0 ? (
                      <span className="text-[11.5px] text-muted-foreground/60">Aucune</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.activeFeatures.map((f) => (
                          <Badge key={f} variant="secondary" className="rounded-full font-semibold">
                            {FEATURE_LABELS[f]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le changement groupé</DialogTitle>
            <DialogDescription>
              {stagedKeys.length} fonctionnalité{stagedKeys.length > 1 ? "s" : ""} sur {selected.size}{" "}
              restaurant{selected.size > 1 ? "s" : ""}. Cette action écrase tout réglage
              individuel existant pour ces fonctionnalités.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={applyBulk} disabled={submitting}>
              {submitting ? "Application…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
