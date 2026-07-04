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
      className="group relative flex flex-col items-center rounded-xl bg-card p-5 pt-14 text-center shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md"
    >
      <div className="absolute -top-10">
        <div className="relative size-24 overflow-hidden rounded-full ring-4 ring-background transition-transform duration-300 group-hover:scale-105">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name_fr}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center bg-accent text-accent-foreground">
              <UtensilsCrossed className="size-8" />
            </div>
          )}
        </div>
        <span className="absolute -right-1 -top-1 rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
          {formatPrice(item.base_price, currency)}
        </span>
      </div>
      <p className="mt-2 font-display text-lg font-semibold">{item.name_fr}</p>
      {item.description_fr && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {item.description_fr}
        </p>
      )}
    </Link>
  );
}
