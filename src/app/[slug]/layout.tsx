import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NavBar } from "@/components/site/nav-bar";
import { Footer } from "@/components/site/footer";
import { getPublicTheme, getRestaurantBySlug } from "@/lib/menu";
import { getSiteTheme } from "@/lib/site-theme";
import { buildThemeCss } from "@/lib/theme";
import { FONT_PAIRS } from "@/lib/fonts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};
  const theme = await getPublicTheme(restaurant.id);
  return {
    title: { default: restaurant.name, template: `%s · ${restaurant.name}` },
    description:
      theme.about_body ??
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

  const { theme, preview } = await getSiteTheme(restaurant);
  const themeCss = buildThemeCss(theme);
  const pair = FONT_PAIRS[theme.font_pair];
  const fontStyle =
    theme.font_pair === "darna-classic"
      ? undefined
      : ({ "--font-display": pair.displayVar, "--font-sans": pair.sansVar } as React.CSSProperties);

  return (
    <>
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      <div
        data-site-theme
        style={fontStyle}
        className="flex min-h-dvh flex-col bg-background text-foreground font-sans"
      >
        {preview && (
          <div className="sticky top-0 z-50 bg-amber-500 py-1 text-center text-xs font-medium text-black">
            Prévisualisation — brouillon non publié
          </div>
        )}
        <NavBar slug={restaurant.slug} name={restaurant.name} logoUrl={theme.logo_url} />
        <main className="flex-1">{children}</main>
        <Footer restaurant={restaurant} theme={theme} />
      </div>
    </>
  );
}
