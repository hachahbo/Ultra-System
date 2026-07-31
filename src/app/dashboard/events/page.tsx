import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { EventsView } from "@/components/dashboard/events-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navEvents") };
}

export default async function EventsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!ctx.features.events) return <FeatureLocked feature="Événements" />;

  return <EventsView canManage={ctx.profile.role === "owner"} />;
}
