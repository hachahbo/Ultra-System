import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsTabs } from "@/components/dashboard/settings-tabs";
import { getSessionContext } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/lib/types";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profile.role !== "owner") redirect("/dashboard");

  // "subscriptions owner read" RLS policy scopes this to the caller's own row.
  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("restaurant_id", ctx.restaurant.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-foreground">Réglages</h1>
      <p className="mt-1 text-[13.5px] font-medium text-muted-foreground">
        Profil du restaurant, abonnement et accès de l&apos;équipe.
      </p>

      <div className="mt-6">
        <SettingsTabs
          restaurant={ctx.restaurant}
          subscription={subscription as Subscription | null}
          features={ctx.features}
          hasStaffManagement={ctx.features.staff_management}
        />
      </div>
    </div>
  );
}
