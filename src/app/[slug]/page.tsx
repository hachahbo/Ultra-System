import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DishCard } from "@/components/site/dish-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getPublicMenu } from "@/lib/menu";

export default async function HomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();
  const { restaurant, items } = menu;

  const featured = items.filter((i) => i.in_stock).slice(0, 4);
  const base = `/${restaurant.slug}`;

  return (
    <>
      {/* Hero — design: serif headline, dark Menu button + orange CTA */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              {restaurant.name}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Nous vous servons la meilleure cuisine
            </h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Commandez en ligne, sur place ou en livraison — ou réservez
              votre table en quelques secondes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href={`${base}/menu`}>Voir le menu</Link>
              </Button>
              <Button asChild size="lg">
                <Link href={`${base}/reservation`}>Réserver une table</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-col gap-2 text-sm text-muted-foreground">
              {restaurant.hours && (
                <span className="inline-flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> {restaurant.hours}
                </span>
              )}
              {restaurant.address && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />{" "}
                  {restaurant.address}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* decorative orange glow, echoes the design's warm accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-primary/10 blur-3xl"
        />
      </section>

      {/* Special dishes */}
      {featured.length > 0 && (
        <section className="bg-muted/50 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              title="Nos spécialités"
              subtitle="Les plats préférés de nos clients, préparés chaque jour avec des produits frais."
            />
            <div className="grid grid-cols-1 gap-x-6 gap-y-14 pt-10 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((item) => (
                <DishCard
                  key={item.id}
                  item={item}
                  slug={restaurant.slug}
                  currency={restaurant.currency}
                />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button asChild variant="outline">
                <Link href={`${base}/menu`}>Tout le menu</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Welcome / about blurb */}
      {restaurant.about_text && (
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <SectionHeading title={`Bienvenue chez ${restaurant.name}`} />
            <p className="text-muted-foreground md:text-lg">
              {restaurant.about_text}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button asChild variant="secondary">
                <Link href={`${base}/menu`}>Commander</Link>
              </Button>
              <Button asChild>
                <Link href={`${base}/reservation`}>Réserver une table</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Contact band */}
      <section className="border-t bg-secondary py-12 text-secondary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <p className="font-display text-2xl font-semibold">
              Une question ? Appelez-nous.
            </p>
            {restaurant.phone && (
              <p className="mt-1 text-secondary-foreground/70">
                {restaurant.phone}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {restaurant.phone && (
              <Button asChild variant="outline" className="border-secondary-foreground/30 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground">
                <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>
                  <Phone className="size-4" /> Appeler
                </a>
              </Button>
            )}
            <Button asChild>
              <Link href={`${base}/contact`}>Nous trouver</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
