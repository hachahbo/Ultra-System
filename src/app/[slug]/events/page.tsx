import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantBySlug, getPublicFeatures, getPublicEvents } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { EventsSection } from "@/components/site/sections/events-section";
import { FeatureUnavailable } from "@/components/site/feature-unavailable";

export const metadata: Metadata = { title: "Événements & Soirées" };

export default async function EventsPage({
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
  if (!features.events) {
    return <FeatureUnavailable message="Les événements ne sont pas disponibles pour ce restaurant." />;
  }

  const events = await getPublicEvents(restaurant.id);

  return (
    <EventsSection
      slug={restaurant.slug}
      restaurantName={restaurant.name}
      phone={restaurant.phone}
      whatsappNumber={restaurant.whatsapp_number}
      events={events}
    />
  );
}
