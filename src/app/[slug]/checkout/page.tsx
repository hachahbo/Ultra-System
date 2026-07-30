import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRestaurantBySlug, getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { CheckoutClient } from "@/components/menu/checkout-client";
import { FeatureUnavailable } from "@/components/site/feature-unavailable";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cart");
  return { title: t("metaTitle") };
}

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
  const t = await getTranslations("Cart");
  if (!features.online_ordering) {
    return <FeatureUnavailable message={t("unavailable")} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {t("heading")}
      </h1>
      <CheckoutClient restaurant={restaurant} />
    </div>
  );
}
