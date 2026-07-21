"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { UtensilsCrossed, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/format";
import type { Item } from "@/lib/types";
import { useCart } from "@/store/cart";
import { ItemDialog } from "@/components/menu/item-dialog";

// Home-page dish card (design: photo medallion, price badge, name) — 
// opens the item details modal on click, and adds to cart via the + button.
export function DishCard({
  item,
  slug,
  currency,
}: {
  item: Item;
  slug: string;
  currency: string;
}) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [justAdded, setJustAdded] = useState<boolean>(false);
  const { add } = useCart();
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, []);

  function flashAdded() {
    setJustAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1100);
  }

  function handleAdd() {
    // If the item requires customization, open the modal instead
    if (item.customization_groups && item.customization_groups.length > 0) {
      setSelectedItem(item);
    } else {
      add({
        item_id: item.id,
        name: item.name_fr,
        unit_price: Number(item.base_price),
        options: [],
        image_url: item.image_url,
      });
      flashAdded();
    }
  }

  return (
    <>
      <div
        onClick={() => setSelectedItem(item)}
        className="group relative mt-8 sm:mt-10 lg:mt-12 flex min-h-[190px] w-full flex-col justify-between overflow-visible rounded-[32px] bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] dark:border-white/10 dark:from-black/40 dark:to-black/10 dark:shadow-none cursor-pointer"
      >
        {/* Floating Image Top Right */}
        <div className="absolute -right-2 -top-8 z-10 flex size-[110px] items-center justify-center sm:-right-4 sm:-top-10 sm:size-[120px] lg:-top-12 lg:size-[130px]">
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
            {formatPrice(item.base_price, currency)}
          </span>
          <motion.div
            className="flex size-10 items-center justify-center rounded-full text-[oklch(0.685_0.165_45)] bg-transparent border-2 border-[oklch(0.685_0.165_45)] transition-colors group-hover:bg-[oklch(0.685_0.165_45)] group-hover:text-white"
            animate={isHydrated && justAdded ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {justAdded ? (
                <motion.span
                  key="check"
                  initial={isHydrated ? { scale: 0, rotate: -30 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={isHydrated ? { scale: 0 } : undefined}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                >
                  <Check className="size-5" strokeWidth={3} />
                </motion.span>
              ) : (
                <motion.span
                  key="plus"
                  initial={isHydrated ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  exit={isHydrated ? { scale: 0 } : undefined}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                >
                  <Plus className="size-5" strokeWidth={2.5} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
      
      <ItemDialog
        key={selectedItem?.id ?? "none"}
        item={selectedItem}
        currency={currency}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
