import { DishCard } from "@/components/site/dish-card";
import type { Item } from "@/lib/types";

const FALLBACK_DISH_IMAGES = [
  "/images/dish-1 1.png",
  "/images/dish-2 1.png",
  "/images/dish-3 1.png",
  "/images/dish-4.png",
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
    <section className="relative overflow-hidden bg-muted py-20 md:py-28">
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
          <h2 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {heading ?? "Our Special Dishes"}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            {sub ??
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            // Override item image if it doesn't exist to use the specific dish images requested
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
    </section>
  );
}
