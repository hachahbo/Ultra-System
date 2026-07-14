import Link from "next/link";
import Image from "next/image";
import { UtensilsCrossed, Plus } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { Item } from "@/lib/types";

// Home-page dish card (design: photo medallion, price badge, name) — links
// into the ordering flow on /menu.
export function DishCard({
  item,
  slug,
  currency,
}: {
  item: Item;
  slug: string;
  currency: string;
}) {
  return (
    <Link
      href={`/${slug}/menu`}
      className="group relative mt-16 flex min-h-[190px] w-full flex-col justify-between overflow-visible rounded-[32px] bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] dark:border-white/10 dark:from-black/40 dark:to-black/10 dark:shadow-none"
    >
      {/* Floating Image Top Right */}
      <div className="absolute -right-2 -top-8 z-10 flex size-[150px] md:size-[90px] items-center justify-center sm:-right-4 sm:-top-12 sm:size-[140px]">
        <div className="relative size-full transition-transform duration-500 group-hover:scale-110 drop-shadow-md">
          <div className="relative size-full overflow-hidden rounded-full">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name_fr}
                fill
                sizes="200px"
                className="object-cover scale-[1.30]"
              />
            ) : (
              <div className="grid size-full place-items-center bg-accent text-accent-foreground shadow-sm">
                <UtensilsCrossed className="size-6" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Text Content (Left side, bounded width) */}
      <div className="relative z-20 w-[65%] pr-6 sm:pr-8">
        <h3 className="font-display text-xl font-bold leading-tight text-white line-clamp-2">
          {item.name_fr}
        </h3>
        {item.description_fr && (
          <p className="mt-2 line-clamp-2 text-sm text-white/80">
            {item.description_fr}
          </p>
        )}
      </div>

      {/* Bottom Actions (Price Left, Add Right) */}
      <div className="mt-4 flex w-full items-center justify-between z-20">
        <span className="font-display text-xl font-black text-[oklch(0.685_0.165_45)]">
          {formatPrice(item.base_price, currency).replace(".00", "")}
        </span>
        <div className="flex size-10 items-center justify-center rounded-full text-white transition-transform group-hover:scale-110">
          <Plus className="size-5" />
        </div>
      </div>
    </Link>
  );
}
