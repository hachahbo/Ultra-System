import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { VariancesView } from "@/components/dashboard/variances-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navVariances") };
}

export default async function VariancesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessRoute(ctx.profile.role, "/dashboard/inventory")) redirect(defaultRouteFor(ctx.profile.role));
  if (!ctx.features.inventory) return <FeatureLocked feature="Inventaire" />;
  if (!ctx.features.recipes) return <FeatureLocked feature="Fiches techniques" />;

  const t = await getTranslations("Dashboard");
  const tVariances = await getTranslations("Variances");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-black text-foreground">{t("navVariances")}</h1>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {tVariances("emptyHint")}
        </p>
      </div>
      <VariancesView />
    </div>
  );
}
