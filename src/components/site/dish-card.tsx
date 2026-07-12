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
      className="group relative mt-20 flex flex-col items-center rounded-3xl bg-card p-6 pt-24 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.1)] dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.5)]"
    >
      {/* Floating image - transparent plates pop out naturally */}
      <div className="absolute -top-20 z-10 flex h-40 w-40 items-center justify-center">
        <div className="relative size-full transition-transform duration-500 group-hover:scale-105 drop-shadow-2xl">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name_fr}
              fill
              sizes="160px"
              className="object-contain"
            />
          ) : (
            <div className="grid size-full place-items-center overflow-hidden rounded-full bg-accent text-accent-foreground shadow-lg">
              <UtensilsCrossed className="size-8" />
            </div>
          )}
        </div>
        
        {/* Floating price badge */}
        <div className="absolute right-0 top-8 z-20 flex size-14 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background shadow-xl p-2 ">
          {formatPrice(item.base_price, currency).replace(".00", "")}
        </div>
      </div>

      <h3 className="mt-2 font-display text-xl font-bold text-card-foreground">
        {item.name_fr}
      </h3>

      {item.description_fr && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {item.description_fr}
        </p>
      )}
    </Link>
  );
}
