"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { restaurantSettingsSchema, type RestaurantSettingsInput } from "@/lib/schemas";
import type { Restaurant } from "@/lib/types";

// Operational settings only — branding (name/logo/address/about) and plan
// currency are set by the Super Admin in the Site Builder now.
export function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const [saving, setSaving] = useState(false);

  const form = useForm<RestaurantSettingsInput>({
    resolver: zodResolver(restaurantSettingsSchema),
    defaultValues: {
      hours: restaurant.hours ?? "",
      phone: restaurant.phone ?? "",
      whatsapp_number: restaurant.whatsapp_number ?? "",
      base_delivery_fee: Number(restaurant.base_delivery_fee),
      is_dine_in_enabled: restaurant.is_dine_in_enabled,
      is_delivery_enabled: restaurant.is_delivery_enabled,
    },
  });

  async function onSubmit(values: RestaurantSettingsInput) {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        toast.error("Enregistrement impossible");
        return;
      }
      toast.success("Réglages enregistrés");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name-display">Nom du restaurant</Label>
        <Input id="name-display" disabled value={restaurant.name} />
        <p className="text-xs text-muted-foreground">
          Modifiable par l&apos;équipe Darna.
        </p>
      </div>

      <Separator />
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Contact</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp_number">WhatsApp</Label>
          <Input id="whatsapp_number" {...form.register("whatsapp_number")} />
        </div>
      </div>

      <Separator />
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Horaires</p>
      <div className="space-y-2">
        <Label htmlFor="hours">Horaires d&apos;ouverture</Label>
        <Input id="hours" placeholder="Lun–Dim, 11h–23h" {...form.register("hours")} />
      </div>

      <Separator />
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Livraison</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency-display">Devise</Label>
          <Input id="currency-display" disabled value={restaurant.currency} />
          <p className="text-xs text-muted-foreground">
            Modifiable par l&apos;équipe Darna.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="base_delivery_fee">Frais de livraison</Label>
          <Input
            id="base_delivery_fee"
            type="number"
            step="0.5"
            min="0"
            inputMode="decimal"
            {...form.register("base_delivery_fee", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="dine_in">Commande sur place</Label>
          <Switch
            id="dine_in"
            checked={form.watch("is_dine_in_enabled")}
            onCheckedChange={(v) => form.setValue("is_dine_in_enabled", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="delivery">Livraison</Label>
          <Switch
            id="delivery"
            checked={form.watch("is_delivery_enabled")}
            onCheckedChange={(v) => form.setValue("is_delivery_enabled", v)}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
