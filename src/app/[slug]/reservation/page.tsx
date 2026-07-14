import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantBySlug, getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { ReservationForm } from "@/components/site/reservation-form";
import { FeatureUnavailable } from "@/components/site/feature-unavailable";

export const metadata: Metadata = { title: "Réserver une table" };

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  const features = applyStatusGate(
    restaurant.status,
    await getPublicFeatures(restaurant.id, restaurant.plan),
  );
  if (!features.reservations) {
    return (
      <FeatureUnavailable message="Les réservations en ligne ne sont pas disponibles pour ce restaurant." />
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-32 lg:pb-48">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Réserver une table
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Le restaurant confirme votre réservation par téléphone ou WhatsApp.
      </p>
      <ReservationForm slug={restaurant.slug} />
    </div>
  );
}
