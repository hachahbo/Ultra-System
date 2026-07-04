import type { Metadata } from "next";
import { ReservationsView } from "@/components/dashboard/reservations-view";

export const metadata: Metadata = { title: "Réservations" };

export default function ReservationsPage() {
  return <ReservationsView />;
}
