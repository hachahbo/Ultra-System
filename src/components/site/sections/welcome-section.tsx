import React from "react";
import Image from "next/image";

export function WelcomeSection({
  base,
  heading,
  body,
}: {
  base: string;
  heading?: string;
  body: string;
}) {
  return (
    <section className="hidden md:block bg-background py-16 md:py-32 overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Text Content */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-16 lg:gap-24">
          {/* Title */}
          <div className="w-full md:w-5/12">
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-foreground">
              {heading ?? (
                <>
                  Bienvenue chez
                  <br />
                  rendez-vous.
                </>
              )}
            </h2>
          </div>

          {/* Description */}
          <div className="w-full md:w-7/12 flex flex-col justify-start pt-2">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6 leading-snug">
              Un lieu pensé comme une maison pour que vous vous y sentiez bien à tout moment.
            </h3>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {body ?? (
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
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]">
            <Image
              src="/images/orendezvous.tanger_1754944082_highlight18054770264426605.jpg"
              alt="Restaurant ambiance 1"
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]">
            <Image
              src="/images/orendezvous.tanger_1770308359_3825946276593598431_73557593345.jpg"
              alt="Restaurant ambiance 2"
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]">
            <Image
              src="/images/hero-default.webp"
              alt="Restaurant ambiance 3"
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]">
            <Image
              src="/images/orendezvous.tanger_1777049699_3882496732303853455_73557593345.jpg"
              alt="Restaurant ambiance 4"
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
