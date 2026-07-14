import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { getRestaurantBySlug } from "@/lib/menu";
import { getSiteTheme } from "@/lib/site-theme";

export const metadata: Metadata = { title: "Qui sommes-nous" };

export default async function AboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  const { theme } = await getSiteTheme(restaurant);

  return (
    <div className="min-h-[80vh] bg-background py-16 md:py-32 overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Text Content */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-16 lg:gap-24">
          {/* Title */}
          <div className="w-full md:w-5/12">
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-foreground">
              {theme.about_title ?? (
                <>
                  Bienvenue chez
                  <br />
                  rendez-vous.
                </>
              )}
            </h1>
          </div>

          {/* Description */}
          <div className="w-full md:w-7/12 flex flex-col justify-start pt-2">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6 leading-snug">
              Un lieu pensé comme une maison pour que vous vous y sentiez bien à tout moment.
            </h3>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {theme.about_body ?? (
                <>
                  À vous de décider où vous préférez vous installer pour vous restaurer : dans notre
                  salon, notre jardin d'hiver, sous notre verrière, ou sur notre terrasse, nous vous
                  accueillons toute la journée pour partager avec vous notre passion du bien manger.
                  <br />
                  <br />
                  Dans notre épicerie pensée et menuisée comme une bibliothèque, vous pouvez retrouver
                  tous les produits que vous avez dégustés, ainsi que ceux réalisés par les
                  producteurs et artisans avec lesquels nous collaborons.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Image Grid placeholders */}
        <div className="mt-16 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]">
            <img
              src="/images/orendezvous.tanger_1754944082_highlight18054770264426605.jpg"
              alt="Restaurant ambiance 1"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]">
            <img
              src="/images/orendezvous.tanger_1770308359_3825946276593598431_73557593345.jpg"
              alt="Restaurant ambiance 2"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]">
            <img
              src="/images/orendezvous.tanger_1777049699_3882496730852669917_73557593345.jpg"
              alt="Restaurant ambiance 3"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]">
            <img
              src="/images/orendezvous.tanger_1777049699_3882496732303853455_73557593345.jpg"
              alt="Restaurant ambiance 4"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Bento Layout Section */}
        <div className="mt-24 md:mt-32 flex flex-col gap-6">
          {/* Top Card */}
          <div className="flex flex-col md:flex-row bg-[#0B1A28] dark:bg-slate-900 rounded-[2rem] p-6 md:p-10 gap-8 items-center text-white relative shadow-md">
            {/* Pill */}
            <div className="absolute top-6 right-6 md:top-10 md:right-10 bg-white dark:bg-background text-black dark:text-foreground px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 shadow-lg z-10">
              <span className="font-bold text-base">4.7</span>
              <span className="text-[#cd6133]">★</span>
              <span className="text-muted-foreground border-l border-border pl-2 text-xs">518 avis clients</span>
            </div>

            {/* Image left */}
            <div className="w-full md:w-1/2 aspect-video md:aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 dark:border-border/50">
              <img src="/images/orendezvous.tanger_1754944082_highlight18054770264426605.jpg" alt="Table" className="w-full h-full object-cover" />
            </div>
            
            {/* Content right */}
            <div className="w-full md:w-1/2 flex flex-col justify-center items-start pt-6 md:pt-0">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
                Bienvenue à la maison !
              </h2>
              <p className="text-lg text-white/80 dark:text-muted-foreground leading-relaxed mb-8">
                Nous vous accueillons toute la journée, en coup de vent ou plus longtemps, seul, en famille ou entre amis. Venez vous attabler et passer un joli moment autour d'un verre, d'un café ou d'un thé et ainsi partager notre passion du bien manger.
              </p>
              <Button asChild variant="outline" className="rounded-full border-white/30 text-white hover:bg-white hover:text-black dark:border-border dark:text-foreground dark:hover:bg-accent uppercase tracking-wider font-semibold px-8 py-6">
                <Link href={`/${restaurant.slug}`}>Découvrez notre maison</Link>
              </Button>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bottom Left Card */}
            <div className="bg-[#fae8e8] dark:bg-[#3b1f1f] rounded-[2rem] p-8 md:p-12 flex flex-col justify-center shadow-md">
              <h3 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                Petit déjeuner, déjeuner, goûter, apéro, brunch, café, ...
              </h3>
              <p className="text-muted-foreground text-lg mb-8">
                Votre bonheur à n'importe quel moment de la journée. Notre carte évolue tous les 15 jours avec des ingrédients frais et locaux.
              </p>
              <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90 uppercase tracking-wider font-semibold px-8 py-6 w-fit">
                <Link href={`/${restaurant.slug}/menu`}>Voir le menu</Link>
              </Button>
            </div>

            {/* Bottom Right Card */}
            <div className="bg-[#cd6133] dark:bg-[#7c3a21] rounded-[2rem] p-8 md:p-12 flex flex-col text-white shadow-md">
              <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 dark:border-border/50 mb-8">
                <img src="/images/orendezvous.tanger_1770308359_3825946276593598431_73557593345.jpg" alt="Interior" className="w-full h-full object-cover" />
              </div>
              <h3 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Privatisation
              </h3>
              <p className="text-white/80 dark:text-white/70 text-lg">
                Organisez vos événements privés dans un cadre unique et chaleureux.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
