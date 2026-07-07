import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TablesEditor } from "@/components/dashboard/tables-editor";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Tables" };

export default async function TablesPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profile.role !== "owner") redirect("/dashboard");
  if (!ctx.features.floor_plan) return <FeatureLocked feature="Plan de salle" />;

  return <TablesEditor restaurantSlug={ctx.restaurant.slug} />;
}
