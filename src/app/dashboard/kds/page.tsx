import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KdsView } from "@/components/dashboard/kds-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Cuisine (KDS)" };

export default async function KdsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !["owner", "manager", "serveur", "cuisine"].includes(ctx.profile.role)) {
    redirect("/dashboard/orders");
  }

  // The KDS is meant to run full-screen, so we break out of the standard container constraints
  return (
    <div className="-mx-4 md:-mx-8 h-[calc(100vh-80px)] flex flex-col">
      <div className="px-4 md:px-8 shrink-0">
        <h1 className="font-display text-3xl font-bold text-foreground">Cuisine</h1>
        <p className="mt-1 text-[13.5px] font-medium text-muted-foreground mb-6">
          Affichage des commandes en direct par station.
        </p>
      </div>

      <div className="flex-1 min-h-0 px-4 md:px-8 pb-4">
        {ctx.features.kds ? (
          <KdsView />
        ) : (
          <FeatureLocked feature="Kitchen Display System (KDS)" />
        )}
      </div>
    </div>
  );
}
