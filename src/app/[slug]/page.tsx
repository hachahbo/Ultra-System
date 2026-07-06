import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DishCard } from "@/components/site/dish-card";
import { SectionHeading } from "@/components/site/section-heading";
import { HeroContent } from "@/components/site/hero-content";
import { HeroImages } from "@/components/site/hero-images";
import { getPublicMenu } from "@/lib/menu";

export default async function HomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();
  const { restaurant, items } = menu;

  const featured = items.filter((i) => i.in_stock).slice(0, 4);
  const base = `/${restaurant.slug}`;

  return (
    <>
      {/* Hero Section Redesign */}
      <section className="relative w-full overflow-hidden bg-background">
        {/* Subtle Background Rings (Left) */}
        <div className="pointer-events-none absolute right-[30%] top-[10%]   w-full max-w-[400px]  dark:invert ">
          <img src="/images/Group (3).svg" alt="" className="h-full w-full object-contain object-left-top" />
        </div>
        
        {/* Subtle Background Botanical Leaves (Top Right) */}
        <div className="pointer-events-none absolute right-[5%] top-[3%] w-48  dark:invert  sm:w-64">
           <img src="/images/Group (1).svg" alt="" className="h-auto w-full" />
        </div>

        {/* Subtle Background Botanical Leaves (Bottom Right) */}
        <div className="pointer-events-none absolute right-[-2%] bottom-[13%] w-32 dark:invert sm:w-64 z-0">
           <img src="/images/Group (2).svg" alt="" className="h-auto w-full" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:px-8 lg:py-24">
          
          {/* Left Content (Animated Client Component) */}
          <HeroContent base={base} />

          {/* Right Images (Animated Client Component) */}
          <HeroImages />

        </div>
      </section>

      {/* Special dishes */}
      {featured.length > 0 && (
        <section className="relative overflow-hidden bg-[#F8F9FA] dark:bg-[#1f2120] py-20 md:py-28">
          {/* Decorative Botanicals */}
          <div className="pointer-events-none absolute left-[2%] top-[5%] w-42 opacity-10 dark:invert dark:opacity-20 sm:w-80">
            <img src="/images/Group (5).svg" alt="" className="h-auto w-full" />
          </div>
          <div className="pointer-events-none absolute right-[5%] top-[10%] w-48 opacity-10 dark:invert dark:opacity-20 sm:w-64">
            <img src="/images/Group (1).svg" alt="" className="h-auto w-full" />
          </div>
          <div className="pointer-events-none absolute bottom-[5%] right-[2%] w-72 opacity-10 dark:invert dark:opacity-20 sm:w-96">
            <img src="/images/Group (6).svg" alt="" className="h-auto w-full" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4">
            <div className="mx-auto mb-16 max-w-xl text-center">
              <h2 className="font-display text-4xl font-bold tracking-tight text-[#111827] dark:text-white md:text-5xl">
                Our Special Dishes
              </h2>
              <p className="mt-4 text-sm text-muted-foreground dark:text-gray-300 md:text-base">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-8 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((item, index) => {
                const dishImages = [
                  "/images/dish-1 1.png",
                  "/images/dish-2 1.png",
                  "/images/dish-3 1.png",
                  "/images/dish-4.png",
                ];
                
                // Override item image if it doesn't exist to use the specific dish images requested
                const itemWithImage = {
                  ...item,
                  image_url: item.image_url || dishImages[index] || null,
                };
                
                return (
                  <DishCard
                    key={item.id}
                    item={itemWithImage}
                    slug={restaurant.slug}
                    currency={restaurant.currency}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Welcome / about blurb */}
      {restaurant.about_text && (
        <section className="relative overflow-hidden bg-[#F8F9FA] dark:bg-[#1f2120] py-16 md:py-32">
          {/* Decorative Botanicals */}
          <div className="pointer-events-none absolute right-[5%] top-[10%] w-64 dark:invert  sm:w-80">
            <img src="/images/Group (4).svg" alt="" className="h-auto w-full" />
          </div>
          <div className="pointer-events-none absolute bottom-[10%] right-[30%] w-48 dark:invert  sm:w-64">
            <img src="/images/Group.svg" alt="" className="h-auto w-full" />
          </div>

          <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 md:flex-row lg:px-8">
            {/* Left Image */}
            <div className="relative w-full md:w-1/2 flex justify-center">
                <img 
                  src="/images/dish-2 1.png" 
                  alt="Chicken dish" 
                  className="w-[80%] max-w-[400px] object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                />
            </div>

            {/* Right Content */}
            <div className="flex w-full flex-col justify-center md:w-1/2">
              <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-[#111827] dark:text-white md:text-5xl lg:text-6xl">
                Welcome to Our <br /> Restaurant
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
                {restaurant.about_text}
              </p>
              
              <div className="mt-10 flex flex-wrap gap-4">
                <Button asChild size="lg" className="rounded-md bg-[#111827] px-8 text-white hover:bg-[#111827]/90 shadow-lg">
                  <Link href={`${base}/menu`}>Menu</Link>
                </Button>
                <Button asChild size="lg" className="rounded-md px-8 shadow-lg">
                  <Link href={`${base}/reservation`}>Book a table</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
