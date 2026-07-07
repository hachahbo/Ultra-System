"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
import { FEATURE_LABELS } from "@/lib/feature-labels";
import { FEATURE_KEYS, type FeatureKey, type Restaurant } from "@/lib/types";

async function fetchRestaurants(): Promise<Restaurant[]> {
  const res = await fetch("/api/admin/restaurants?limit=100");
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.restaurants;
}

export function PermissionsView() {
  const queryClient = useQueryClient();
  const { data: restaurants, isPending } = useQuery({
    queryKey: ["admin-restaurants-all"],
    queryFn: fetchRestaurants,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Record<FeatureKey, boolean>>(
    {} as Record<FeatureKey, boolean>,
  );
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

  function setPendingChange(key: FeatureKey, enabled: boolean) {
    setPendingChanges((prev) => ({ ...prev, [key]: enabled }));
  }

  const changeCount = Object.keys(pendingChanges).length;

  async function applyBulk() {
    setSubmitting(true);
    const changes = (Object.keys(pendingChanges) as FeatureKey[]).map((featureKey) => ({
      featureKey,
      enabled: pendingChanges[featureKey],
    }));
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
    toast.success(`${changes.length} fonctionnalité${changes.length > 1 ? "s" : ""} appliquée${changes.length > 1 ? "s" : ""} sur ${selected.size} restaurant${selected.size > 1 ? "s" : ""}`);
    setConfirmOpen(false);
    setPendingChanges({} as Record<FeatureKey, boolean>);
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-restaurants-all"] });
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Permissions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sélectionnez des restaurants et une fonctionnalité pour appliquer un changement en masse.
        Pour les réglages fins par restaurant, ouvrez son panneau depuis la page Restaurants.
      </p>

      {selected.size > 0 && (
        <div className="mt-4 rounded-xl border bg-muted/40 p-4">
          <p className="text-sm font-medium">
            {selected.size} restaurant{selected.size > 1 ? "s" : ""} sélectionné
            {selected.size > 1 ? "s" : ""} — définir :
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FEATURE_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2">
                <span className="text-sm">{FEATURE_LABELS[key]}</span>
                <Switch
                  checked={pendingChanges[key] ?? false}
                  onCheckedChange={(checked) => setPendingChange(key, checked)}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button disabled={changeCount === 0} onClick={() => setConfirmOpen(true)}>
              Appliquer
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border">
        {isPending || !restaurants ? (
          <div className="space-y-2 p-4">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggleSelected(r.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.plan}</TableCell>
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
              {changeCount} fonctionnalité{changeCount > 1 ? "s" : ""} sur {selected.size}{" "}
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
