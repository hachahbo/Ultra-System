import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TablesEditor } from "@/components/dashboard/tables-editor";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";

export const metadata: Metadata = { title: "Tables" };

export default async function TablesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessRoute(ctx.profile.role, "/dashboard/tables")) redirect(defaultRouteFor(ctx.profile.role));
  if (!ctx.features.floor_plan) return <FeatureLocked feature="Plan de salle" />;

  return <TablesEditor restaurantSlug={ctx.restaurant.slug} />;
}
