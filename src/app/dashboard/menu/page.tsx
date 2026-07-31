import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { MenuManager } from "@/components/dashboard/menu-manager";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navMenu") };
}

export default async function DashboardMenuPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessRoute(ctx.profile.role, "/dashboard/menu")) redirect(defaultRouteFor(ctx.profile.role));
  if (!ctx.features.menu_editor) return <FeatureLocked feature="Éditeur de menu" />;

  return <MenuManager />;
}
