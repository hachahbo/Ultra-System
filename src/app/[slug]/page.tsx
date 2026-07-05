import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DishCard } from "@/components/site/dish-card";
import { SectionHeading } from "@/components/site/section-heading";
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
        {/* Subtle Background Rings */}
        <div className="pointer-events-none absolute -left-[20%] top-[-10%] h-[150%] w-full max-w-3xl opacity-20">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full stroke-muted-foreground/30 stroke-1">
            <circle cx="20" cy="20" r="45" />
            <circle cx="10" cy="10" r="70" />
            <circle cx="30" cy="0" r="90" />
          </svg>
        </div>
        
        {/* Subtle Background Botanical Leaves (right side) */}
        <div className="pointer-events-none absolute right-[-5%] top-1/2 -translate-y-1/2 w-96 opacity-10">
           <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full stroke-foreground stroke-1">
              {/* Abstract leaf shape placeholder */}
              <path d="M100 250 C120 150, 200 150, 150 50 C100 0, 50 100, 100 250 Z" />
              <path d="M100 250 C80 150, 0 150, 50 50 C100 0, 150 100, 100 250 Z" />
           </svg>
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:px-8 lg:py-24">
          
          {/* Left Content */}
          <div className="flex w-full flex-col justify-center lg:w-1/2">
            <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-7xl">
              We provide the <br /> best food for you
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" className="rounded-md bg-foreground px-8 text-background hover:bg-foreground/90 shadow-lg">
                <Link href={`${base}/menu`}>Menu</Link>
              </Button>
              <Button asChild size="lg" className="rounded-md px-8 shadow-lg">
                <Link href={`${base}/reservation`}>Book a table</Link>
              </Button>
            </div>

            {/* Social & Contact */}
            <div className="mt-20 flex items-center gap-4">
              <div className="flex gap-3">
                <a href="#" className="flex size-10 items-center justify-center rounded-full border border-border/80 text-foreground transition-colors hover:bg-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="#" className="flex size-10 items-center justify-center rounded-full border border-border/80 text-foreground transition-colors hover:bg-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="#" className="flex size-10 items-center justify-center rounded-full border border-border/80 text-foreground transition-colors hover:bg-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                </a>
              </div>
              <div className="h-[2px] w-16 bg-border/80"></div>
            </div>
          </div>

          {/* Right Images (Arch + Plate) */}
          <div className="relative mt-12 flex w-full justify-center lg:mt-0 lg:w-1/2">
            <div className="relative h-[500px] w-full max-w-[400px] sm:h-[600px]">
              {/* Main Arch Image */}
              <div className="absolute right-0 top-0 h-full w-[90%] overflow-hidden rounded-t-[100px] rounded-br-[60px] rounded-bl-[20px] shadow-2xl">
                <img 
                  src="/images/orendezvous.tanger_1777049699_3882496730852669917_73557593345.jpg" 
                  alt="Restaurant interior" 
                  className="h-full w-full object-cover"
                />
              </div>
              
              {/* Overlapping Plate */}
              <div className="absolute -left-12 bottom-[15%] w-[65%] sm:-left-20">
                <img 
                  src="images/orendezvous.tanger_1783019424_3932574417688072480_73557593345.jpg" 
                  alt="Delicious food plate" 
                  className="aspect-square w-full rounded-full border-[3px] border-background object-cover shadow-2xl"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Special dishes */}
      {featured.length > 0 && (
        <section className="relative overflow-hidden bg-[#F8F9FA] py-20 md:py-28">
          {/* Decorative Botanicals */}
          <div className="pointer-events-none absolute left-[10%] top-10 w-48 opacity-10">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full stroke-foreground stroke-1">
              <path d="M50 150 Q20 80 100 20 Q180 80 150 150 Q100 120 50 150" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M100 20 L100 120" strokeLinecap="round" />
              <path d="M50 150 Q30 180 80 190" strokeLinecap="round" />
            </svg>
          </div>
          <div className="pointer-events-none absolute bottom-10 right-[10%] w-56 opacity-10">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full stroke-foreground stroke-1">
              <path d="M150 50 Q180 120 100 180 Q20 120 50 50 Q100 80 150 50" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M100 180 L100 80" strokeLinecap="round" />
              <path d="M150 50 Q170 20 120 10" strokeLinecap="round" />
            </svg>
          </div>

          <div className="relative mx-auto max-w-6xl px-4">
            <div className="mx-auto mb-16 max-w-xl text-center">
              <h2 className="font-display text-4xl font-bold tracking-tight text-[#111827] md:text-5xl">
                Our Special Dishes
              </h2>
              <p className="mt-4 text-sm text-muted-foreground md:text-base">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-8 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((item) => (
                <DishCard
                  key={item.id}
                  item={item}
                  slug={restaurant.slug}
                  currency={restaurant.currency}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Welcome / about blurb */}
      {restaurant.about_text && (
        <section className="relative overflow-hidden bg-background py-16 md:py-32">
          {/* Decorative Botanicals */}
          <div className="pointer-events-none absolute right-[5%] top-[10%] w-64 opacity-[0.03]">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full stroke-foreground stroke-1">
              <path d="M100 20 C50 80, 20 150, 100 180 C180 150, 150 80, 100 20 Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M100 20 L100 180" strokeLinecap="round" />
            </svg>
          </div>
          <div className="pointer-events-none absolute bottom-[10%] right-[30%] w-48 opacity-[0.03]">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full stroke-foreground stroke-1">
              <path d="M50 150 Q20 80 100 20 Q180 80 150 150 Q100 120 50 150" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M100 20 L100 120" strokeLinecap="round" />
              <path d="M50 150 Q30 180 80 190" strokeLinecap="round" />
            </svg>
          </div>

          <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 md:flex-row lg:px-8">
            {/* Left Image */}
            <div className="relative w-full md:w-1/2">
              <img 
                src="/images/welcome-chicken.png" 
                alt="Chicken dish" 
                className="w-full max-w-[600px] rounded-3xl drop-shadow-2xl mix-blend-multiply"
              />
            </div>

            {/* Right Content */}
            <div className="flex w-full flex-col justify-center md:w-1/2">
              <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-[#111827] md:text-5xl lg:text-6xl">
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
