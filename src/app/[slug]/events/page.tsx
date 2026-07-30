import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRestaurantBySlug, getPublicFeatures, getPublicEvents } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { EventsSection } from "@/components/site/sections/events-section";
import { FeatureUnavailable } from "@/components/site/feature-unavailable";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Events");
  return { title: t("metaTitle") };
}

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
    const t = await getTranslations("Events");
    return <FeatureUnavailable message={t("unavailable")} />;
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
