import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EventsView } from "@/components/dashboard/events-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Événements" };

export default async function EventsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!ctx.features.events) return <FeatureLocked feature="Événements" />;

  return <EventsView canManage={ctx.profile.role === "owner"} />;
}
