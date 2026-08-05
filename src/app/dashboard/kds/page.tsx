import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { KdsView } from "@/components/dashboard/kds-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navKds") };
}

export default async function KdsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !["owner", "manager", "serveur", "cuisine"].includes(ctx.profile.role)) {
    redirect("/dashboard/orders");
  }

  const t = await getTranslations("Dashboard");
  const tKitchen = await getTranslations("Kitchen");

  // The KDS is meant to run full-screen, so we break out of the standard container constraints
  return (
    <div className="-mx-4 md:-mx-8 h-[calc(100vh-80px)] flex flex-col">
      <div className="px-4 md:px-8 shrink-0 mb-4">
        <h1 className="font-display text-2xl font-black text-foreground">{t("navKds")}</h1>
        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
          {tKitchen("emptyHint")}
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
