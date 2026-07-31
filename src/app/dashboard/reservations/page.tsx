import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ReservationsView } from "@/components/dashboard/reservations-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navReservations") };
}

export default async function ReservationsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!ctx.features.reservations) return <FeatureLocked feature="Réservations" />;

  return <ReservationsView />;
}
