import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionContext } from "@/lib/dashboard";
import { defaultRouteFor } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navAnalytics") };
}

// Dynamically imported so Recharts ships as its own async chunk instead of
// inflating /dashboard/analytics's initial route JS.
const AnalyticsView = dynamic(
  () => import("@/components/dashboard/analytics-view").then((m) => m.AnalyticsView),
  { loading: () => <Skeleton className="mt-6 h-[600px] w-full rounded-2xl" /> },
);

export default async function AnalyticsPage() {
  const ctx = await getSessionContext();
  // Belt-and-suspenders: the dashboard layout's canAccessRoute gate already
  // redirects non-owners away from /dashboard/analytics.
  if (!ctx) redirect("/");
  if (ctx.profile.role !== "owner") redirect(defaultRouteFor(ctx.profile.role));
  if (!ctx.features.analytics) return <FeatureLocked feature="Statistiques" />;

  return <AnalyticsView />;
}
