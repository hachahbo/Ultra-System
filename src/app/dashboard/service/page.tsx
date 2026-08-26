import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ServiceView } from "@/components/dashboard/service-view";
import { getSessionContext } from "@/lib/dashboard";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navService") };
}

export default async function ServicePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  // Single source of truth for the matrix, rather than restating the role list
  // the way kds/page.tsx does — and defaultRouteFor guarantees the fallback is
  // somewhere this role can actually go, so no redirect loop.
  if (!canAccessRoute(ctx.profile.role, "/dashboard/service")) {
    redirect(defaultRouteFor(ctx.profile.role));
  }

  const t = await getTranslations("Dashboard");
  const ts = await getTranslations("Service");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-black text-foreground">{t("navService")}</h1>
        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
          {ts("laneApprove")} · {ts("laneKitchen")} · {ts("laneReady")}
        </p>
      </div>
      <ServiceView />
    </div>
  );
}
