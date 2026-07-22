import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { getRestaurantBySlug } from "@/lib/menu";
import { getSiteTheme } from "@/lib/site-theme";

export const metadata: Metadata = { title: "Qui sommes-nous" };

const DEFAULT_ABOUT_GALLERY = [
  "/images/about/about-storefront.webp",
  "/images/about/about-2.webp",
  "/images/about/about-5.webp",
  "/images/about/about-4.webp",
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

  const hasCustomGallery =
    theme.about_gallery_urls &&
    theme.about_gallery_urls.length >= 4 &&
    theme.about_gallery_urls.every((url) => url.startsWith("http"));

  const galleryImages = hasCustomGallery ? theme.about_gallery_urls : DEFAULT_ABOUT_GALLERY;
  const bentoCardImage = "/images/about/about-3.webp";

  return (
    <div className="min-h-[80vh] bg-background py-16 md:py-32 overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Text Content */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-16 lg:gap-24">
          {/* Title */}
          <div className="w-full md:w-5/12">
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-foreground">
              {theme.about_title ?? `Bienvenue chez ${restaurant.name}`}
            </h1>
          </div>

          {/* Description */}
          {theme.about_body && (
            <div className="w-full md:w-7/12 flex flex-col justify-start pt-2">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {theme.about_body}
              </p>
            </div>
          )}
        </div>

        {/* Image Grid */}
        {galleryImages.length > 0 && (
          <div className="mt-16 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {galleryImages.slice(0, 4).map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]"
              >
                <Image
                  src={src}
                  alt={`Ambiance ${i + 1}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Bento Layout Section */}
        {(theme.custom_copy.about_bento_heading || theme.custom_copy.about_bento_body) && (
          <div className="mt-24 md:mt-32 flex flex-col gap-6">
            {/* Top Card */}
            <div className="flex flex-col md:flex-row bg-[#0B1A28] dark:bg-slate-900 rounded-[2rem] p-6 md:p-10 gap-8 items-center text-white relative shadow-md">
              {/* Rating pill */}
              {theme.about_rating != null && (
                <div className="absolute top-6 right-6 md:top-10 md:right-10 bg-white dark:bg-background text-black dark:text-foreground px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 shadow-lg z-10">
                  <span className="font-bold text-base">{theme.about_rating.toFixed(1)}</span>
                  <span className="text-[#cd6133]">★</span>
                  {theme.about_review_count != null && (
                    <span className="text-muted-foreground border-l border-border pl-2 text-xs">
                      {theme.about_review_count} avis clients
                    </span>
                  )}
                </div>
              )}

              <div className="relative w-full md:w-1/2 aspect-video md:aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 dark:border-border/50">
                <Image
                  src={bentoCardImage}
                  alt={restaurant.name}
                  fill
                  sizes="(min-width: 768px) 45vw, 90vw"
                  className="object-cover"
                />
              </div>

              <div className="w-full md:w-1/2 flex flex-col justify-center items-start pt-6 md:pt-0">
                <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
                  {theme.custom_copy.about_bento_heading}
                </h2>
                {theme.custom_copy.about_bento_body && (
                  <p className="text-lg text-white/80 dark:text-muted-foreground leading-relaxed mb-8">
                    {theme.custom_copy.about_bento_body}
                  </p>
                )}
                {theme.about_map_url && (
                  <Button asChild className="rounded-full bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-900 uppercase tracking-wider font-semibold px-8 py-6">
                    <a href={theme.about_map_url} target="_blank" rel="noopener noreferrer">
                      Découvrez notre maison
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(theme.custom_copy.about_daypart_heading || theme.custom_copy.about_daypart_body) && (
                <div className="bg-[#fae8e8] dark:bg-[#3b1f1f] rounded-[2rem] p-8 md:p-12 flex flex-col justify-center shadow-md">
                  {theme.custom_copy.about_daypart_heading && (
                    <h3 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                      {theme.custom_copy.about_daypart_heading}
                    </h3>
                  )}
                  {theme.custom_copy.about_daypart_body && (
                    <p className="text-muted-foreground text-lg mb-8">
                      {theme.custom_copy.about_daypart_body}
                    </p>
                  )}
                  <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90 uppercase tracking-wider font-semibold px-8 py-6 w-fit">
                    <Link href={`/${restaurant.slug}/menu`}>Voir le menu</Link>
                  </Button>
                </div>
              )}

              {(theme.custom_copy.about_promo_heading || theme.custom_copy.about_promo_body) && (
                <div className="bg-[#cd6133] dark:bg-[#7c3a21] rounded-[2rem] p-8 md:p-12 flex flex-col text-white shadow-md">
                  {galleryImages[1] && (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 dark:border-border/50 mb-8">
                      <Image
                        src={galleryImages[1]}
                        alt={theme.custom_copy.about_promo_heading ?? restaurant.name}
                        fill
                        sizes="(min-width: 768px) 45vw, 90vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  {theme.custom_copy.about_promo_heading && (
                    <h3 className="font-display text-3xl md:text-4xl font-bold mb-4">
                      {theme.custom_copy.about_promo_heading}
                    </h3>
                  )}
                  {theme.custom_copy.about_promo_body && (
                    <p className="text-white/80 dark:text-white/70 text-lg">
                      {theme.custom_copy.about_promo_body}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
