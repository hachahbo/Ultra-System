import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { SettingsTabs } from "@/components/dashboard/settings-tabs";
import { getSessionContext } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { defaultRouteFor } from "@/lib/permissions";
import type { Subscription } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navSettings") };
}

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (ctx.profile.role !== "owner") redirect(defaultRouteFor(ctx.profile.role));

  const t = await getTranslations("Dashboard");
  const tSettings = await getTranslations("Settings");

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("restaurant_id", ctx.restaurant.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-7xl w-full space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shadow-2xs shrink-0">
          <Settings className="size-6 stroke-[2.25]" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-black text-foreground leading-none">{t("navSettings")}</h1>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {tSettings("profileHint")}
          </p>
        </div>
      </div>

      <div>
        <SettingsTabs
          restaurant={ctx.restaurant}
          subscription={subscription as Subscription | null}
          features={ctx.features}
        />
      </div>
    </div>
  );
}
