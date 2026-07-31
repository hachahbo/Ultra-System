"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LanguageSwitcher } from "@/components/site/language-switcher";
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
  const t = useTranslations("Settings");

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
        toast.error(t("saveFailed"));
        return;
      }
      toast.success(t("saved"));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "h-11 rounded-[11px] border-border bg-background text-[13.5px]";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <SettingsCard title={t("profileTitle")} hint={t("profileHint")}>
        <ReadonlyField
          label={t("restaurantName")}
          value={restaurant.name}
          hint={t("editableByDarna")}
        />
      </SettingsCard>

      <SettingsCard title={t("contactTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone" className="mb-1.5 block text-[12.5px] font-bold text-foreground/80">
              {t("phone")}
            </Label>
            <Input id="phone" className={inputClass} {...form.register("phone")} />
          </div>
          <div>
            <Label htmlFor="whatsapp_number" className="mb-1.5 block text-[12.5px] font-bold text-foreground/80">
              {t("whatsapp")}
            </Label>
            <Input id="whatsapp_number" className={inputClass} {...form.register("whatsapp_number")} />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title={t("hoursTitle")} hint={t("hoursHint")}>
        <div>
          <Label htmlFor="hours" className="mb-1.5 block text-[12.5px] font-bold text-foreground/80">
            {t("hours")}
          </Label>
          <Input
            id="hours"
            placeholder={t("hoursPlaceholder")}
            className={inputClass}
            {...form.register("hours")}
          />
        </div>
      </SettingsCard>

      <SettingsCard title={t("deliveryTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadonlyField label={t("currency")} value={restaurant.currency} hint={t("editableByDarna")} />
          <div>
            <Label
              htmlFor="base_delivery_fee"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground/80"
            >
              {t("deliveryFee")}
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
              <div className="text-[13.5px] font-bold text-foreground">{t("dineIn")}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                {t("dineInHint")}
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
              <div className="text-[13.5px] font-bold text-foreground">{t("delivery")}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                {t("deliveryHint")}
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

      <SettingsCard title={t("languageTitle")} hint={t("languageHint")}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Languages className="size-4 text-muted-foreground" />
            <span className="text-[13.5px] font-bold text-foreground">{t("language")}</span>
          </div>
          {/* Applies on selection (cookie + refresh), so it is not part of
              this form's submit — nothing to save, nothing to lose. */}
          <LanguageSwitcher />
        </div>
      </SettingsCard>

      <Button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl py-5 font-bold sm:w-auto sm:self-end sm:px-8"
      >
        {saving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
