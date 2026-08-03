import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ReconciliationView } from "@/components/dashboard/reconciliation-view";
import { getSessionContext } from "@/lib/dashboard";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Reconciliation");
  return { title: t("title") };
}

export default async function ReconciliationPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessRoute(ctx.profile.role, "/dashboard/orders/reconciliation")) {
    redirect(defaultRouteFor(ctx.profile.role));
  }

  const t = await getTranslations("Reconciliation");

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-1 text-[13.5px] font-medium text-muted-foreground">{t("subtitle")}</p>
      <ReconciliationView />
    </div>
  );
}
