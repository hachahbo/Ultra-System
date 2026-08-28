import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { KdsView } from "@/components/dashboard/kds-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";
import { defaultRouteFor } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navKds") };
}

export default async function KdsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !["owner", "manager", "serveur", "cuisine"].includes(ctx.profile.role)) {
    redirect("/dashboard/orders");
  }

  // FeatureLocked is an upsell, so it is only worth showing to someone who can
  // act on it. defaultRouteFor sends `cuisine` here on login (permissions.ts),
  // and the sidebar hides the entry when the feature is off — so on a plan
  // without KDS the cook landed on a lock screen with no way back. Everyone
  // who cannot buy the feature goes to the orders list instead. Fixing it here
  // rather than in defaultRouteFor is deliberate: that helper is called from
  // src/proxy.ts and two client components, none of which hold a
  // SessionContext, so teaching it about features would cost a query per
  // request. Every entry path funnels through this page anyway.
  if (!ctx.features.kds && ctx.profile.role !== "owner" && ctx.profile.role !== "manager") {
    // defaultRouteFor is the single source of truth for "somewhere this role can
    // actually go" — except for `cuisine`, whose default route is this very
    // page. Sending them through it would loop, so they get the orders list.
    redirect(ctx.profile.role === "cuisine" ? "/dashboard/orders" : defaultRouteFor(ctx.profile.role));
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
          <KdsView role={ctx.profile.role} />
        ) : (
          <FeatureLocked feature="Kitchen Display System (KDS)" />
        )}
      </div>
    </div>
  );
}
