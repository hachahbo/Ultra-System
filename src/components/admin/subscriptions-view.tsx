"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanBadge } from "@/components/admin/badges";
import { SubscriptionEditDialog } from "@/components/admin/subscription-edit-dialog";
import { formatPrice, formatDateTime } from "@/lib/format";
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

const STATUS_LABELS: Record<Subscription["status"], string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Impayé",
  canceled: "Annulé",
};

export function SubscriptionsView() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: fetchSubscriptions,
  });
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Abonnements</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Facturation manuelle — changer de plan, prolonger un essai ou marquer un paiement reçu.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        {isPending || !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Fin d&apos;essai / renouvellement</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.restaurant?.name ?? "—"}</TableCell>
                  <TableCell><PlanBadge plan={s.plan_tier} /></TableCell>
                  <TableCell>{STATUS_LABELS[s.status]}</TableCell>
                  <TableCell>{s.billing_cycle === "yearly" ? "Annuel" : "Mensuel"}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatPrice(s.price_mad, s.restaurant?.currency ?? "MAD")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.trial_ends_at
                      ? formatDateTime(s.trial_ends_at)
                      : s.current_period_end
                        ? formatDateTime(s.current_period_end)
                        : "—"}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {s.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                      Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] })}
        />
      )}
    </div>
  );
}
