import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { TablesEditor } from "@/components/dashboard/tables-editor";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navTables") };
}

export default async function TablesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessRoute(ctx.profile.role, "/dashboard/tables")) redirect(defaultRouteFor(ctx.profile.role));
  if (!ctx.features.floor_plan) return <FeatureLocked feature="Plan de salle" />;

  return <TablesEditor restaurantSlug={ctx.restaurant.slug} />;
}
