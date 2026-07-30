import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getRestaurantBySlug } from "@/lib/menu";
import { getSiteTheme } from "@/lib/site-theme";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  return { title: t("metaTitle") };
}

const DEFAULT_ABOUT_GALLERY = [
  "/images/orendezvous/orendezvous.tanger_1782412303_3927481512476698742_73557593345.jpg",
  "/images/orendezvous/orendezvous.tanger_1782412303_3927481511788834209_73557593345.jpg",
  "/images/orendezvous/orendezvous.tanger_1782412303_3927481512191507130_73557593345.jpg",
  "/images/orendezvous/orendezvous.tanger_1770820323_3830240942847468663_73557593345.jpg",
];

export default async function AboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  const { theme } = await getSiteTheme(restaurant);
  const t = await getTranslations("About");

  const hasCustomGallery =
    theme.about_gallery_urls &&
    theme.about_gallery_urls.length >= 4 &&
    theme.about_gallery_urls.every((url) => url.startsWith("http"));

  const galleryImages = hasCustomGallery ? theme.about_gallery_urls : DEFAULT_ABOUT_GALLERY;
  const bentoCardImage = "/images/about/about-3.webp";

  const ratingVal = theme.about_rating ?? 4.8;
  const reviewCountVal = theme.about_review_count ?? 518;

  // The intro used to be three paragraphs of one restaurant's French prose
  // hardcoded into this page. It now renders that restaurant's own about text
  // (blank-line separated paragraphs), with generic translated copy as the
  // only fallback.
  const introParagraphs = (theme.about_body ?? t("introFallback"))
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Main Body Container */}
      <div className="py-16 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-20 md:space-y-32">
          {/* Intro Story Grid */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-20 items-start">
            <div className="w-full lg:w-5/12">
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight text-foreground">
                {theme.about_title ?? t("defaultTitle", { name: restaurant.name })}
              </h2>
            </div>
            <div className="w-full lg:w-7/12 space-y-6 text-muted-foreground text-base sm:text-lg leading-relaxed">
              {introParagraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className={
                    i === 0 ? "font-semibold text-foreground text-lg sm:text-xl" : undefined
                  }
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* 4-Image Ambiance Gallery */}
          {galleryImages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {galleryImages.slice(0, 4).map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-all duration-500 hover:scale-[1.02] hover:shadow-xl group"
                >
                  <Image
                    src={src}
                    alt={t("galleryAlt", { index: i + 1 })}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Navy Bento Feature Card */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0B1A28] dark:bg-slate-900 text-white p-6 sm:p-10 lg:p-14 shadow-2xl">
            {/* Rating Badge */}
            <div className="sm:absolute top-6 right-6 sm:top-10 sm:right-10 mb-6 sm:mb-0 w-fit bg-white/95 dark:bg-background/95 text-black dark:text-foreground px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-3 shadow-xl backdrop-blur-md z-10">
              <span className="font-bold text-lg">{ratingVal.toFixed(1)}</span>
              <span className="text-[#ff5a1f] text-lg">★</span>
              <span className="text-muted-foreground border-l border-border pl-3 text-xs font-semibold">
                {t("reviewCount", { count: reviewCountVal })}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-14 items-center">
              <div className="relative w-full lg:w-1/2 aspect-video lg:aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                <Image
                  src={bentoCardImage}
                  alt={restaurant.name}
                  fill
                  sizes="(min-width: 1024px) 45vw, 90vw"
                  className="object-cover"
                />
              </div>

              <div className="w-full lg:w-1/2 flex flex-col justify-center items-start space-y-6">
                <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  {theme.custom_copy.about_bento_heading ?? t("bentoHeading")}
                </h3>
                <p className="text-white/80 text-base sm:text-lg leading-relaxed">
                  {theme.custom_copy.about_bento_body ?? t("bentoBody")}
                </p>
                {theme.about_map_url ? (
                  <Button asChild className="rounded-full bg-transparent border border-white/40 hover:bg-white hover:text-black text-white uppercase tracking-wider text-xs font-bold px-8 py-6 transition-all duration-300">
                    <a href={theme.about_map_url} target="_blank" rel="noopener noreferrer">
                      {t("discover")}
                    </a>
                  </Button>
                ) : (
                  <Button asChild className="rounded-full bg-white text-black hover:bg-gray-100 uppercase tracking-wider text-xs font-bold px-8 py-6">
                    <Link href={`/${restaurant.slug}/contact`}>
                      {t("discover")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Dual Feature Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Daypart & Menu */}
            <div className="bg-[#fae8e8] dark:bg-[#2c1919] rounded-[2.5rem] p-8 sm:p-12 flex flex-col justify-between shadow-lg space-y-8">
              <div className="space-y-4">
                <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                  {theme.custom_copy.about_daypart_heading ?? t("daypartHeading")}
                </h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {theme.custom_copy.about_daypart_body ?? t("daypartBody")}
                </p>
              </div>

              {galleryImages[2] && (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-md">
                  <Image
                    src={galleryImages[2]}
                    alt={t("specialtiesAlt")}
                    fill
                    sizes="(min-width: 768px) 45vw, 90vw"
                    className="object-cover"
                  />
                </div>
              )}

              <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90 uppercase tracking-wider text-xs font-bold px-8 py-6 w-fit">
                <Link href={`/${restaurant.slug}/menu`}>{t("viewMenu")}</Link>
              </Button>
            </div>

            {/* Card 2: Promo & Private Events */}
            <div className="bg-[#cd6133] dark:bg-[#7c3a21] text-white rounded-[2.5rem] p-8 sm:p-12 flex flex-col justify-between shadow-lg space-y-8">
              {galleryImages[1] && (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/20 shadow-md">
                  <Image
                    src={galleryImages[1]}
                    alt={theme.custom_copy.about_promo_heading ?? t("promoHeading")}
                    fill
                    sizes="(min-width: 768px) 45vw, 90vw"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                  {theme.custom_copy.about_promo_heading ?? t("promoHeading")}
                </h3>
                <p className="text-white/85 text-base leading-relaxed">
                  {theme.custom_copy.about_promo_body ?? t("promoBody")}
                </p>
              </div>

              <Button asChild className="rounded-full bg-transparent border border-white/40 hover:bg-white hover:text-black text-white uppercase tracking-wider text-xs font-bold px-8 py-6 w-fit transition-all duration-300">
                <Link href={`/${restaurant.slug}/contact`}>{t("privatizationCta")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
