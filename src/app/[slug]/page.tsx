import { Fragment } from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { HeroSection } from "@/components/site/sections/hero-section";
import { SpecialsSection } from "@/components/site/sections/specials-section";
import { WelcomeSection } from "@/components/site/sections/welcome-section";
import { getPublicMenu } from "@/lib/menu";
import { getSiteTheme } from "@/lib/site-theme";
import type { SectionKey } from "@/lib/types";

// Below-the-fold on the homepage (after Hero + up to 4 specials + Welcome) —
// dynamically imported so they don't inflate the above-the-fold JS/RSC
// payload that matters for LCP.
const ValuesSection = dynamic(() =>
  import("@/components/site/sections/values-section").then((m) => m.ValuesSection),
);
const TestimonialsSection = dynamic(() =>
  import("@/components/site/sections/testimonials-section").then((m) => m.TestimonialsSection),
);

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
  // enabled. "gallery" is still reserved — no renderer yet — so the
  // toggle/reorder machinery stays future-proof without needing it built.
  // values/testimonials/welcome all additionally self-skip when their
  // underlying content is empty, so an enabled-by-default section with no
  // data yet renders nothing rather than falling back to demo content.
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
          imageUrl={theme.specials_image_url}
        />
      ) : null,
    welcome: theme.about_body ? (
      <WelcomeSection
        heading={theme.custom_copy.welcome_heading ?? theme.about_title ?? undefined}
        body={theme.about_body}
        images={theme.welcome_gallery_urls}
      />
    ) : null,
    values: <ValuesSection items={theme.values_items} />,
    testimonials: <TestimonialsSection items={theme.testimonials} />,
  };

  return (
    <>
      {theme.sections
        .filter((s) => s.enabled)
        .map((s) => {
          const node = renderers[s.key];
          return node ? <Fragment key={s.key}>{node}</Fragment> : null;
        })}
    </>
  );
}
