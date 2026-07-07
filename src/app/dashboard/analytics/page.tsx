import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Statistiques" };

export default async function AnalyticsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profile.role !== "owner") redirect("/dashboard");
  if (!ctx.features.analytics) return <FeatureLocked feature="Statistiques" />;

  return <AnalyticsView />;
}
