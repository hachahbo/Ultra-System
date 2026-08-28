import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRestaurantBySlug } from "@/lib/menu";
import { OrderTracker } from "@/components/menu/order-tracker";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Track");
  return { title: t("metaTitle") };
}

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <OrderTracker slug={slug} orderId={id} restaurantName={restaurant.name} />
    </div>
  );
}
