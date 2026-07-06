import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Statistiques" };

export default async function AnalyticsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profile.role !== "owner") redirect("/dashboard");

  return <AnalyticsView />;
}
