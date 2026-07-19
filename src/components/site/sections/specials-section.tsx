import Image from "next/image";
import { DishCard } from "@/components/site/dish-card";
import type { Item } from "@/lib/types";

const FALLBACK_DISH_IMAGES = [
  "/images/Gemini_Generated_Image_izo3jjizo3jjizo3.png",
  "/images/Gemini_Generated_Image_hs7cwmhs7cwmhs7c.png",
  "/images/Gemini_Generated_Image_igfco9igfco9igfc.png",
  "/images/Gemini_Generated_Image_izo3jjizo3jjizo3.png",
];

export function SpecialsSection({
  items,
  slug,
  currency,
  heading,
  sub,
}: {
  items: Item[];
  slug: string;
  currency: string;
  heading?: string;
  sub?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-28">
      {/* Decorative Botanicals */}
      <div className="pointer-events-none absolute left-[2%] top-[5%] w-42 opacity-10 dark:invert dark:opacity-20 sm:w-80">
        <Image src="/images/Group (5).svg" alt="" width={119} height={124} className="h-auto w-full" />
      </div>
      <div className="pointer-events-none absolute right-[5%] top-[10%] w-48 opacity-10 dark:invert dark:opacity-20 sm:w-64">
        <Image src="/images/Group (1).svg" alt="" width={316} height={300} className="h-auto w-full" />
      </div>
      <div className="pointer-events-none absolute bottom-[5%] right-[2%] w-72 opacity-10 dark:invert dark:opacity-20 sm:w-96">
        <Image src="/images/Group (6).svg" alt="" width={77} height={78} className="h-auto w-full" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 xl:px-8">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {heading ?? "Our Special Dishes"}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            {sub ??
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore."}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row overflow-hidden rounded-[40px] bg-[#0b1f2e] shadow-2xl">
          {/* Left Side: Featured Image */}
          <div className="w-full lg:w-[45%] p-4 sm:p-8 lg:p-12">
            <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-[32px] shadow-xl">
              <Image
                src="/images/orendezvous.tanger_1777049699_3882496730961703431_73557593345.jpg"
                fill
                sizes="(min-width: 1024px) 45vw, 90vw"
                className="object-cover object-center hover:scale-105 transition-transform duration-500"
                alt="Featured dishes collage"
              />
            </div>
          </div>

          {/* Right Side: 2x2 Grid of Dishes */}
          <div className="w-full lg:w-[55%] p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
            <div className="grid grid-cols-1 gap-x-12 gap-y-4 xl:gap-x-12 xl:gap-y-14 sm:grid-cols-2 mt-8">
              {items.map((item, index) => {
                const itemWithImage = {
                  ...item,
                  image_url: item.image_url || FALLBACK_DISH_IMAGES[index] || null,
                };
                return (
                  <DishCard key={item.id} item={itemWithImage} slug={slug} currency={currency} />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
