import Link from "next/link";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
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
      className="group relative mt-14 flex min-h-[180px] w-full flex-col justify-between overflow-visible rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:shadow-none"
    >
      {/* Floating Image Top Right */}
      <div className="absolute -right-6 -top-12 z-10 flex size-[150px] items-center justify-center sm:-right-8 sm:-top-16 sm:size-[180px]">
        <div className="relative size-full transition-transform duration-500 group-hover:scale-105 drop-shadow-md">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name_fr}
              fill
              sizes="180px"
              className="object-contain"
            />
          ) : (
            <div className="grid size-full place-items-center overflow-hidden rounded-full bg-accent text-accent-foreground shadow-sm">
              <UtensilsCrossed className="size-6" />
            </div>
          )}
        </div>
      </div>

      {/* Text Content (Left side, bounded width) */}
      <div className="relative z-20 w-[60%] sm:w-[65%]">
        <h3 className="font-display text-xl font-bold leading-tight text-card-foreground">
          {item.name_fr}
        </h3>
        {item.description_fr && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {item.description_fr}
          </p>
        )}
      </div>

      {/* Bottom Right Price */}
      <div className="mt-2 flex w-full justify-end z-20">
        <span className="font-display text-xl font-black text-foreground">
          {formatPrice(item.base_price, currency).replace(".00", "")}
        </span>
      </div>
    </Link>
  );
}
