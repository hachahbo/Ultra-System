import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRestaurantBySlug, getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { GiftsClient } from "@/components/menu/gifts-client";
import { FeatureUnavailable } from "@/components/site/feature-unavailable";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Gifts");
  return { title: t("metaTitle") };
}

export default async function GiftsPage({
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
    const t = await getTranslations("Cart");
    return <FeatureUnavailable message={t("unavailable")} />;
  }

  return <GiftsClient slug={restaurant.slug} currency={restaurant.currency} />;
}
