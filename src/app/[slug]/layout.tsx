import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NavBar } from "@/components/site/nav-bar";
import { Footer } from "@/components/site/footer";
import { getRestaurantBySlug } from "@/lib/menu";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};
  return {
    title: { default: restaurant.name, template: `%s · ${restaurant.name}` },
    description:
      restaurant.about_text ??
      `${restaurant.name} — menu, commande et réservation en ligne.`,
  };
}

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar
        slug={restaurant.slug}
        name={restaurant.name}
        logoUrl={restaurant.logo_url}
      />
      <main className="flex-1">{children}</main>
      <Footer restaurant={restaurant} />
    </div>
  );
}
