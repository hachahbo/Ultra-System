import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantBySlug } from "@/lib/menu";
import { CheckoutClient } from "@/components/menu/checkout-client";

export const metadata: Metadata = { title: "Votre commande" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Votre commande
      </h1>
      <CheckoutClient restaurant={restaurant} />
    </div>
  );
}
