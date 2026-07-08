"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, PlanBadge } from "@/components/admin/badges";
import { FEATURE_LABELS } from "@/lib/feature-labels";
import { formatPrice, formatDateTime } from "@/lib/format";
import { FEATURE_KEYS, type FeatureKey, type Restaurant, type Subscription } from "@/lib/types";

type DetailData = {
  restaurant: Restaurant;
  subscription: Subscription | null;
  features: Record<FeatureKey, { enabled: boolean; overridden: boolean }>;
  revenueSeries: { date: string; revenue: number }[];
  orderCount: number;
  recentAuditEntries: { id: string; action: string; created_at: string; metadata: Record<string, unknown> }[];
};

async function fetchDetail(id: string): Promise<DetailData> {
  const res = await fetch(`/api/admin/restaurants/${id}`);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

export function RestaurantDetailPanel({
  restaurantId,
  open,
  onOpenChange,
}: {
  restaurantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["admin-restaurant", restaurantId],
    queryFn: () => fetchDetail(restaurantId!),
    enabled: !!restaurantId && open,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-restaurant", restaurantId] });
    queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
  }

  async function toggleFeature(featureKey: FeatureKey, enabled: boolean) {
    if (!restaurantId) return;
    const res = await fetch(`/api/admin/restaurants/${restaurantId}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureKey, enabled }),
    });
    if (!res.ok) {
      toast.error("Mise à jour impossible");
      return;
    }
    invalidate();
  }

  async function resetFeature(featureKey: FeatureKey) {
    if (!restaurantId) return;
    const res = await fetch(
      `/api/admin/restaurants/${restaurantId}/permissions?reset=${featureKey}`,
      { method: "PATCH" },
    );
    if (!res.ok) {
      toast.error("Réinitialisation impossible");
      return;
    }
    invalidate();
  }

  async function setStatus(status: "active" | "suspended") {
    if (!restaurantId) return;
    const res = await fetch(`/api/admin/restaurants/${restaurantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Mise à jour impossible");
      return;
    }
    toast.success(status === "suspended" ? "Restaurant suspendu" : "Restaurant réactivé");
    invalidate();
  }

  async function resetOwnerPassword() {
    if (!restaurantId) return;
    const res = await fetch(`/api/admin/restaurants/${restaurantId}/reset-owner-password`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Réinitialisation impossible");
      return;
    }
    const { tempPassword } = await res.json();
    toast.success(`Mot de passe temporaire : ${tempPassword}`, { duration: 15000 });
  }

  async function deleteRestaurant() {
    if (!restaurantId || !data) return;
    const res = await fetch(
      `/api/admin/restaurants/${restaurantId}?confirm=${encodeURIComponent(deleteConfirm)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast.error("Suppression impossible");
      return;
    }
    toast.success("Restaurant supprimé");
    setDeleteConfirm("");
    onOpenChange(false);
    queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {isPending || !data ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{data.restaurant.name}</SheetTitle>
              <SheetDescription>
                {data.restaurant.slug} · {data.restaurant.city ?? "—"}
              </SheetDescription>
              <div className="flex gap-2 pt-1">
                <PlanBadge plan={data.restaurant.plan} />
                <StatusBadge status={data.restaurant.status} />
              </div>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Revenu (30 j)</p>
                  <p className="mt-1 font-bold tabular-nums">
                    {formatPrice(
                      data.revenueSeries.reduce((s, d) => s + d.revenue, 0),
                      data.restaurant.currency,
                    )}
                  </p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Commandes (total)</p>
                  <p className="mt-1 font-bold tabular-nums">{data.orderCount}</p>
                </Card>
              </div>

              {data.subscription && (
                <Card className="p-3">
                  <p className="text-sm font-medium">Abonnement</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.subscription.plan_tier} · {data.subscription.status} ·{" "}
                    {formatPrice(data.subscription.price_mad, data.restaurant.currency)} /{" "}
                    {data.subscription.billing_cycle === "yearly" ? "an" : "mois"}
                  </p>
                  {data.subscription.trial_ends_at && (
                    <p className="text-xs text-muted-foreground">
                      Essai jusqu&apos;au {formatDateTime(data.subscription.trial_ends_at)}
                    </p>
                  )}
                </Card>
              )}

              <div>
                <p className="mb-2 text-sm font-medium">Fonctionnalités</p>
                <div className="space-y-2">
                  {FEATURE_KEYS.map((key) => {
                    const f = data.features[key];
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                        <div className="min-w-0">
                          <p className="text-sm">{FEATURE_LABELS[key]}</p>
                          <p className="text-xs text-muted-foreground">
                            {f.overridden ? "Remplacé par l'admin" : "Défaut du plan"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {f.overridden && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Réinitialiser"
                              onClick={() => resetFeature(key)}
                            >
                              <RotateCcw className="size-3.5" />
                            </Button>
                          )}
                          <Switch
                            checked={f.enabled}
                            onCheckedChange={(checked) => toggleFeature(key, checked)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/admin/restaurants/${data.restaurant.id}/site`}>
                    Éditeur du site
                  </Link>
                </Button>
                {data.restaurant.status === "suspended" ? (
                  <Button onClick={() => setStatus("active")}>Réactiver</Button>
                ) : (
                  <Button variant="outline" onClick={() => setStatus("suspended")}>
                    Suspendre
                  </Button>
                )}
                <Button variant="outline" onClick={resetOwnerPassword}>
                  Réinitialiser le mot de passe du propriétaire
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Supprimer définitivement</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer {data.restaurant.name} ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible et supprime toutes les données du
                        restaurant (commandes, menu, clients, personnel). Tapez{" "}
                        <strong>{data.restaurant.slug}</strong> pour confirmer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="px-1">
                      <Label htmlFor="confirm-slug" className="sr-only">
                        Confirmation
                      </Label>
                      <Input
                        id="confirm-slug"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder={data.restaurant.slug}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirm("")}>
                        Annuler
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={deleteConfirm !== data.restaurant.slug}
                        onClick={deleteRestaurant}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {data.recentAuditEntries.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Activité récente</p>
                  <div className="space-y-1.5">
                    {data.recentAuditEntries.map((entry) => (
                      <p key={entry.id} className="text-xs text-muted-foreground">
                        {formatDateTime(entry.created_at)} — {entry.action}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
