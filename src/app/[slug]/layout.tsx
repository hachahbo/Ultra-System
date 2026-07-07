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

  // Suspended = the whole public site is down, not just ordering/reservations
  // (unlike "expired", which still shows the menu — see applyStatusGate).
  if (restaurant.status === "suspended") {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {restaurant.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce site est momentanément indisponible.
          </p>
        </div>
      </div>
    );
  }

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
