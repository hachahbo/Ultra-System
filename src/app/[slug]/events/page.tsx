import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantBySlug } from "@/lib/menu";
import { EventsSection } from "@/components/site/sections/events-section";

export const metadata: Metadata = { title: "Événements & Soirées" };

export default async function EventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <EventsSection
      slug={restaurant.slug}
      restaurantName={restaurant.name}
      phone={restaurant.phone}
      whatsappNumber={restaurant.whatsapp_number}
    />
  );
}
