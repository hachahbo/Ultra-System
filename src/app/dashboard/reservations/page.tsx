import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReservationsView } from "@/components/dashboard/reservations-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Réservations" };

export default async function ReservationsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!ctx.features.reservations) return <FeatureLocked feature="Réservations" />;

  return <ReservationsView />;
}
