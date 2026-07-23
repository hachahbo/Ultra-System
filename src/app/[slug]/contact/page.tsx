import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantBySlug } from "@/lib/menu";
import { getSiteTheme } from "@/lib/site-theme";
import { ContactFormSection } from "@/components/site/sections/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  const { theme } = await getSiteTheme(restaurant);

  return (
    <ContactFormSection
      restaurantName={restaurant.name}
      address={theme.address}
      hours={restaurant.hours}
      phone={restaurant.phone}
      mapUrl={theme.about_map_url}
      whatsappNumber={restaurant.whatsapp_number}
    />
  );
}
