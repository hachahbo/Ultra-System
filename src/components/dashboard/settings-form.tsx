"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { restaurantSettingsSchema, type RestaurantSettingsInput } from "@/lib/schemas";
import type { Restaurant } from "@/lib/types";

function SettingsCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-[15px] font-extrabold text-foreground">{title}</div>
      {hint && <div className="mt-1 text-[12.5px] text-muted-foreground">{hint}</div>}
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function ReadonlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <Label className="mb-1.5 block text-[12.5px] font-bold text-foreground/80">{label}</Label>
      <div className="relative">
        <Input
          disabled
          value={value}
          className="h-11 rounded-[11px] border-border bg-muted/40 pr-10 text-[13.5px] text-muted-foreground"
        />
        <CreditCard className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground/60" />
      </div>
      {hint && <p className="mt-1.5 text-[11.5px] text-primary">{hint}</p>}
    </div>
  );
}

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

  const inputClass = "h-11 rounded-[11px] border-border bg-background text-[13.5px]";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <SettingsCard title="Profil du restaurant" hint="Informations publiques affichées à vos clients.">
        <ReadonlyField
          label="Nom du restaurant"
          value={restaurant.name}
          hint="Modifiable par l'équipe Darna."
        />
      </SettingsCard>

      <SettingsCard title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone" className="mb-1.5 block text-[12.5px] font-bold text-foreground/80">
              Téléphone
            </Label>
            <Input id="phone" className={inputClass} {...form.register("phone")} />
          </div>
          <div>
            <Label htmlFor="whatsapp_number" className="mb-1.5 block text-[12.5px] font-bold text-foreground/80">
              WhatsApp
            </Label>
            <Input id="whatsapp_number" className={inputClass} {...form.register("whatsapp_number")} />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Horaires d'ouverture" hint="Affichés aux clients sur votre page publique.">
        <div>
          <Label htmlFor="hours" className="mb-1.5 block text-[12.5px] font-bold text-foreground/80">
            Horaires
          </Label>
          <Input
            id="hours"
            placeholder="Lun–Dim, 11h–23h"
            className={inputClass}
            {...form.register("hours")}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Livraison & Commande">
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadonlyField label="Devise" value={restaurant.currency} hint="Modifiable par l'équipe Darna." />
          <div>
            <Label
              htmlFor="base_delivery_fee"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground/80"
            >
              Frais de livraison
            </Label>
            <Input
              id="base_delivery_fee"
              type="number"
              step="0.5"
              min="0"
              inputMode="decimal"
              className={inputClass}
              {...form.register("base_delivery_fee", { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between border-t border-border py-3.5">
            <div>
              <div className="text-[13.5px] font-bold text-foreground">Commande sur place</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                Accepter les commandes en salle via QR code.
              </div>
            </div>
            <Switch
              id="dine_in"
              checked={form.watch("is_dine_in_enabled")}
              onCheckedChange={(v) => form.setValue("is_dine_in_enabled", v)}
            />
          </div>
          <div className="flex items-center justify-between border-t border-border py-3.5">
            <div>
              <div className="text-[13.5px] font-bold text-foreground">Livraison</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                Proposer la livraison à domicile.
              </div>
            </div>
            <Switch
              id="delivery"
              checked={form.watch("is_delivery_enabled")}
              onCheckedChange={(v) => form.setValue("is_delivery_enabled", v)}
            />
          </div>
        </div>
      </SettingsCard>

      <Button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl py-5 font-bold sm:w-auto sm:self-end sm:px-8"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
