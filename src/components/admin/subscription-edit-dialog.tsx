"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Subscription } from "@/lib/types";

export function SubscriptionEditDialog({
  subscription,
  restaurantName,
  open,
  onOpenChange,
  onSaved,
}: {
  subscription: Subscription;
  restaurantName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [planTier, setPlanTier] = useState(subscription.plan_tier);
  const [status, setStatus] = useState(subscription.status);
  const [billingCycle, setBillingCycle] = useState(subscription.billing_cycle);
  const [priceMad, setPriceMad] = useState(String(subscription.price_mad));
  const [trialEndsAt, setTrialEndsAt] = useState(
    subscription.trial_ends_at ? subscription.trial_ends_at.slice(0, 10) : "",
  );
  const [notes, setNotes] = useState(subscription.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    const res = await fetch(`/api/admin/subscriptions/${subscription.restaurant_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_tier: planTier,
        status,
        billing_cycle: billingCycle,
        price_mad: Number(priceMad),
        trial_ends_at: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        notes: notes || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Mise à jour impossible");
      return;
    }
    toast.success("Abonnement mis à jour");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{restaurantName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={planTier} onValueChange={(v) => setPlanTier(v as typeof planTier)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="trialing">Essai</SelectItem>
                  <SelectItem value="past_due">Impayé</SelectItem>
                  <SelectItem value="canceled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cycle</Label>
              <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as typeof billingCycle)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Prix (MAD)</Label>
              <Input
                id="price"
                type="number"
                value={priceMad}
                onChange={(e) => setPriceMad(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trial-ends">Fin d&apos;essai</Label>
            <Input
              id="trial-ends"
              type="date"
              value={trialEndsAt}
              onChange={(e) => setTrialEndsAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (référence de paiement, etc.)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
