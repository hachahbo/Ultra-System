"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Store, Phone, Clock, Truck, Languages, Save, Sparkles, MessageSquare, ShieldCheck, Coins } from "lucide-react";
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
  icon: Icon,
  children,
}: {
  title: string;
  hint?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 shadow-xs hover:shadow-md transition-all space-y-4">
      <div className="flex items-center gap-3 border-b border-border/60 pb-3.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-2xs shrink-0">
          <Icon className="size-4.5 stroke-[2.25]" />
        </div>
        <div>
          <h3 className="text-base font-black text-foreground leading-none">{title}</h3>
          {hint && <p className="mt-1 text-xs font-semibold text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ReadonlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          disabled
          value={value}
          className="h-11.5 rounded-2xl border-border/80 bg-muted/30 pr-10 text-xs font-bold text-muted-foreground"
        />
        <ShieldCheck className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground/60" />
      </div>
      {hint && <p className="text-[11px] font-bold text-primary">{hint}</p>}
    </div>
  );
}

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

  const inputClass = "h-11.5 rounded-2xl border-border/80 bg-background/50 text-xs font-semibold focus-visible:ring-primary/30 shadow-2xs";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* 2-Column Horizontal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left Column */}
        <div className="space-y-5">
          <SettingsCard icon={Store} title={t("profileTitle")} hint={t("profileHint")}>
            <ReadonlyField
              label={t("restaurantName")}
              value={restaurant.name}
              hint={t("editableByDarna")}
            />
          </SettingsCard>

          <SettingsCard icon={Phone} title={t("contactTitle")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t("phone")}
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="phone" className={`${inputClass} pl-10`} {...form.register("phone")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp_number" className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t("whatsapp")}
                </Label>
                <div className="relative">
                  <MessageSquare className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="whatsapp_number" className={`${inputClass} pl-10`} {...form.register("whatsapp_number")} />
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard icon={Clock} title={t("hoursTitle")} hint={t("hoursHint")}>
            <div className="space-y-1.5">
              <Label htmlFor="hours" className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                {t("hours")}
              </Label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hours"
                  placeholder={t("hoursPlaceholder")}
                  className={`${inputClass} pl-10`}
                  {...form.register("hours")}
                />
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          <SettingsCard icon={Truck} title={t("deliveryTitle")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label={t("currency")} value={restaurant.currency} hint={t("editableByDarna")} />
              <div className="space-y-1.5">
                <Label htmlFor="base_delivery_fee" className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t("deliveryFee")}
                </Label>
                <div className="relative">
                  <Coins className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="base_delivery_fee"
                    type="number"
                    step="0.5"
                    min="0"
                    inputMode="decimal"
                    className={`${inputClass} pl-10`}
                    {...form.register("base_delivery_fee", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-3.5">
                <div>
                  <div className="text-xs font-extrabold text-foreground">{t("dineIn")}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    {t("dineInHint")}
                  </div>
                </div>
                <Switch
                  id="dine_in"
                  checked={form.watch("is_dine_in_enabled")}
                  onCheckedChange={(v: boolean) => form.setValue("is_dine_in_enabled", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-3.5">
                <div>
                  <div className="text-xs font-extrabold text-foreground">{t("delivery")}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    {t("deliveryHint")}
                  </div>
                </div>
                <Switch
                  id="delivery"
                  checked={form.watch("is_delivery_enabled")}
                  onCheckedChange={(v: boolean) => form.setValue("is_delivery_enabled", v)}
                />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard icon={Languages} title={t("languageTitle")} hint={t("languageHint")}>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/20 p-3.5">
              <div className="flex items-center gap-2.5">
                <Languages className="size-4 text-muted-foreground" />
                <span className="text-xs font-extrabold text-foreground">{t("language")}</span>
              </div>
              <LanguageSwitcher />
            </div>
          </SettingsCard>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-4 shadow-xl">
        <span className="text-xs font-extrabold text-muted-foreground flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> Modifiez vos réglages et enregistrez à tout moment.
        </span>
        <Button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-primary px-7 py-2.5 h-11 text-xs font-extrabold text-white shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Save className="size-4 mr-1.5" />
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
