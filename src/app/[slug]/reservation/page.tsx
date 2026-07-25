import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantBySlug, getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { getSiteTheme } from "@/lib/site-theme";
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

  const { theme } = await getSiteTheme(restaurant);

  return (
    <ReservationForm
      slug={restaurant.slug}
      restaurantName={restaurant.name}
      address={theme.address}
      hours={restaurant.hours}
      phone={restaurant.phone}
      whatsappNumber={restaurant.whatsapp_number}
      featureImage="/images/orendezvous/orendezvous.tanger_1777049699_3882496730299010586_73557593345.jpg"
    />
  );
}
