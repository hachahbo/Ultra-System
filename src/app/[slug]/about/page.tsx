import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { getRestaurantBySlug } from "@/lib/menu";

export const metadata: Metadata = { title: "Qui sommes-nous" };

export default async function AboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Qui sommes-nous
      </h1>
      <div className="mt-6 space-y-4 text-muted-foreground md:text-lg">
        <p>
          {restaurant.about_text ??
            `${restaurant.name} vous accueille tous les jours dans une ambiance chaleureuse et familiale.`}
        </p>
      </div>
      <div className="mt-10 flex gap-3">
        <Button asChild variant="secondary">
          <Link href={`/${restaurant.slug}/menu`}>Voir le menu</Link>
        </Button>
        <Button asChild>
          <Link href={`/${restaurant.slug}/reservation`}>
            Réserver une table
          </Link>
        </Button>
      </div>
    </div>
  );
}
