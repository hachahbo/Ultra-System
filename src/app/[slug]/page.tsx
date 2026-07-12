import { Fragment } from "react";
import { notFound } from "next/navigation";
import { HeroSection } from "@/components/site/sections/hero-section";
import { SpecialsSection } from "@/components/site/sections/specials-section";
import { WelcomeSection } from "@/components/site/sections/welcome-section";
import { TestimonialsSection } from "@/components/site/sections/testimonials-section";
import { getPublicMenu } from "@/lib/menu";
import { getSiteTheme } from "@/lib/site-theme";
import type { SectionKey } from "@/lib/types";

export default async function HomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();
  const { restaurant, items } = menu;
  const { theme } = await getSiteTheme(restaurant);

  const featured = items.filter((i) => i.in_stock).slice(0, 4);
  const base = `/${restaurant.slug}`;

  // Renderers keyed by section — theme.sections controls order + which are
  // enabled. Reserved keys (chef/testimonials/gallery) have no renderer yet
  // and are simply skipped: the toggle/reorder machinery is future-proof
  // without needing those sections built.
  const renderers: Partial<Record<SectionKey, React.ReactNode>> = {
    hero: (
      <HeroSection
        base={base}
        headline={theme.custom_copy.hero_headline}
        sub={theme.custom_copy.hero_sub}
        ctaLabel={theme.custom_copy.hero_cta}
        images={theme.hero_image_urls}
      />
    ),
    specials:
      featured.length > 0 ? (
        <SpecialsSection
          items={featured}
          slug={restaurant.slug}
          currency={restaurant.currency}
          heading={theme.custom_copy.specials_heading}
          sub={theme.custom_copy.specials_sub}
        />
      ) : null,
    welcome: theme.about_body ? (
      <WelcomeSection base={base} heading={theme.custom_copy.welcome_heading ?? theme.about_title ?? undefined} body={theme.about_body} />
    ) : null,
  };

  return (
    <>
      {theme.sections
        .filter((s) => s.enabled)
        .map((s) => {
          const node = renderers[s.key];
          return node ? <Fragment key={s.key}>{node}</Fragment> : null;
        })}
      <TestimonialsSection />
    </>
  );
}
