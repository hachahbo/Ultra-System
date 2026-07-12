import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { StaffManagement } from "@/components/dashboard/staff-management";
import { SubscriptionCard } from "@/components/dashboard/subscription-card";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { Separator } from "@/components/ui/separator";
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
    <div>
      <h1 className="font-display text-2xl font-semibold">Réglages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Profil du restaurant et accès de l&apos;équipe.
      </p>

      <div className="mt-6">
        <SubscriptionCard restaurant={ctx.restaurant} subscription={subscription as Subscription | null} />
      </div>

      <div className="mt-6">
        <SettingsForm restaurant={ctx.restaurant} />
      </div>

      <div className="mt-8 space-y-3">
        <Separator />
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Équipe</p>
        {ctx.features.staff_management ? (
          <StaffManagement />
        ) : (
          <FeatureLocked feature="Gestion du personnel" />
        )}
      </div>
    </div>
  );
}
