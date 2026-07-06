"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { restaurantSettingsSchema, type RestaurantSettingsInput } from "@/lib/schemas";
import type { Restaurant } from "@/lib/types";

export function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(restaurant.logo_url);

  const form = useForm<RestaurantSettingsInput>({
    resolver: zodResolver(restaurantSettingsSchema),
    defaultValues: {
      name: restaurant.name,
      address: restaurant.address ?? "",
      hours: restaurant.hours ?? "",
      phone: restaurant.phone ?? "",
      whatsapp_number: restaurant.whatsapp_number ?? "",
      currency: restaurant.currency,
      base_delivery_fee: Number(restaurant.base_delivery_fee),
      about_text: restaurant.about_text ?? "",
      is_dine_in_enabled: restaurant.is_dine_in_enabled,
      is_delivery_enabled: restaurant.is_delivery_enabled,
    },
  });
  const errors = form.formState.errors;

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const compressed = await compressImage(file, 512, 0.85);
      const supabase = createClient();
      const path = `${restaurant.id}/logo-${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage
        .from("menu-images")
        .upload(path, compressed, { cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch {
      toast.error("Échec de l'envoi du logo");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: RestaurantSettingsInput) {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, logo_url: logoUrl }),
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
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {logoUrl && (
            <Image
              src={logoUrl}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-lg object-cover"
            />
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <ImagePlus className="size-4" />
            {uploading ? "Envoi…" : logoUrl ? "Changer" : "Ajouter"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogo(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nom du restaurant</Label>
        <Input id="name" {...form.register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" {...form.register("address")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hours">Horaires</Label>
        <Input id="hours" placeholder="Lun–Dim, 11h–23h" {...form.register("hours")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">Devise</Label>
          <Input id="currency" {...form.register("currency")} />
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

      <div className="space-y-2">
        <Label htmlFor="about_text">À propos</Label>
        <Textarea id="about_text" rows={4} {...form.register("about_text")} />
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

      <Button type="submit" className="w-full" disabled={saving || uploading}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
