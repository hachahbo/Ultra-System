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
      className="group relative mt-16 flex flex-col items-center rounded-3xl bg-background p-6 pt-20 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.1)]"
    >
      {/* Floating circular image */}
      <div className="absolute -top-16 z-10 flex h-32 w-32 items-center justify-center">
        <div className="relative size-full overflow-hidden rounded-full shadow-lg transition-transform duration-500 group-hover:scale-105">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name_fr}
              fill
              sizes="128px"
              className="object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center bg-accent text-accent-foreground">
              <UtensilsCrossed className="size-8" />
            </div>
          )}
        </div>
        
        {/* Floating price badge */}
        <div className="absolute -right-2 top-4 z-20 flex size-12 items-center justify-center rounded-full bg-[#111827] text-sm font-bold text-white shadow-xl ring-4 ring-background">
          {formatPrice(item.base_price, currency).replace(".00", "")}
        </div>
      </div>

      <h3 className="mt-2 font-display text-xl font-bold text-foreground">
        {item.name_fr}
      </h3>
      
      {item.description_fr && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground/80">
          {item.description_fr}
        </p>
      )}
    </Link>
  );
}
