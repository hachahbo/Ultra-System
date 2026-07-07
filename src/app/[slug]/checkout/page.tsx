import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantBySlug, getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { CheckoutClient } from "@/components/menu/checkout-client";
import { FeatureUnavailable } from "@/components/site/feature-unavailable";

export const metadata: Metadata = { title: "Votre commande" };

export default async function CheckoutPage({
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
  if (!features.online_ordering) {
    return (
      <FeatureUnavailable message="La commande en ligne n'est pas disponible pour ce restaurant." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Votre commande
      </h1>
      <CheckoutClient restaurant={restaurant} />
    </div>
  );
}
