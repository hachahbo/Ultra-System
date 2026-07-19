import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VariancesView } from "@/components/dashboard/variances-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";

export const metadata: Metadata = { title: "Écarts de stock" };

export default async function VariancesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessRoute(ctx.profile.role, "/dashboard/inventory")) redirect(defaultRouteFor(ctx.profile.role));
  if (!ctx.features.inventory) return <FeatureLocked feature="Inventaire" />;
  if (!ctx.features.recipes) return <FeatureLocked feature="Fiches techniques" />;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">Écarts de stock</h1>
      <p className="mt-1 text-[13.5px] font-medium text-muted-foreground">
        Commandes qui ont dépassé le stock disponible — le stock est toujours
        clampé à zéro, jamais négatif.
      </p>
      <VariancesView />
    </div>
  );
}
