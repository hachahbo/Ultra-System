"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import type { Item, PublicMenu } from "@/lib/types";
import { ItemDialog } from "./item-dialog";

// ─── Animation Variants ────────────────────────────────────────────────────

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: { opacity: 0, y: 18, transition: { duration: 0.18 } },
};

const cartBarVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.26, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: 24,
    scale: 0.96,
    transition: { duration: 0.18 },
  },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function MenuBrowser({
  menu,
  table,
}: {
  menu: PublicMenu;
  table: string | null;
}) {
  const { restaurant, categories, items } = menu;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const { setContext, add, lines } = useCart();
  const prefersReducedMotion = useReducedMotion();

  // Defer motion styles until after hydration to avoid SSR mismatch.
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => { setIsHydrated(true); }, []);

  // Bind cart to this restaurant; ?table= marks dine-in.
  useEffect(() => {
    setContext(restaurant.slug, table ?? undefined);
  }, [restaurant.slug, table, setContext]);

  const visibleItems = useMemo(
    () =>
      activeCategory
        ? items.filter((i) => i.category_id === activeCategory)
        : items,
    [items, activeCategory],
  );

  const subtotal = cartSubtotal(lines);
  const count = lines.reduce((n, l) => n + l.quantity, 0);

  function handleAdd(item: Item) {
    if (item.customization_groups.length > 0) {
      setSelectedItem(item);
    } else {
      add({
        item_id: item.id,
        name: item.name_fr,
        unit_price: Number(item.base_price),
        options: [],
      });
    }
  }

  return (
    <>
      {/* ── Category Tabs ─────────────────────────────────── */}
      <div className="sticky top-16 z-30 -mx-4 mt-4 overflow-x-auto bg-background/90 px-4 py-3 backdrop-blur-md [scrollbar-width:none]">
        <div className="flex gap-2 w-max">
          <CategoryPill
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          >
            Tout
          </CategoryPill>
          {categories.map((c) => (
            <CategoryPill
              key={c.id}
              active={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.name_fr}
            </CategoryPill>
          ))}
        </div>
      </div>

      {/* ── Item Grid ─────────────────────────────────────── */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.ul
          key={activeCategory ?? "all"}
          className="mt-4 space-y-3 pb-32"
          variants={isHydrated && !prefersReducedMotion ? listVariants : undefined}
          initial={isHydrated ? "hidden" : false}
          animate="show"
        >
          {visibleItems.map((item) => (
            <motion.li
              key={item.id}
              variants={prefersReducedMotion ? undefined : cardVariants}
              suppressHydrationWarning
              className={`group relative overflow-hidden rounded-2xl bg-[#1C1C1E] shadow-lg ${
                item.in_stock ? "cursor-pointer" : "opacity-50"
              }`}
              onClick={() => item.in_stock && handleAdd(item)}
            >
              {/* ── Top: Hero Image ── */}
              <div className="relative h-44 w-full overflow-hidden">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name_fr}
                    fill
                    sizes="(max-width: 768px) 100vw, 672px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#2C2C2E]">
                    <UtensilsCrossed className="size-10 text-white/20" />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-[#1C1C1E]/20 to-transparent" />
                
                {/* Out of stock badge */}
                {!item.in_stock && (
                  <div className="absolute left-3 top-3">
                    <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm">
                      Épuisé
                    </span>
                  </div>
                )}
              </div>

              {/* ── Bottom: Content ── */}
              <div className="flex items-end justify-between px-4 pb-4 pt-3">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-semibold leading-snug tracking-tight text-white">
                    {item.name_fr}
                  </p>
                  {item.description_fr && (
                    <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-white/50">
                      {item.description_fr}
                    </p>
                  )}
                  <p className="mt-2 text-base font-bold text-[#FF6B35]">
                    {formatPrice(item.base_price, restaurant.currency)}
                  </p>
                </div>

                {/* Add button */}
                {item.in_stock && (
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] shadow-lg shadow-[#FF6B35]/30 transition-transform duration-150 group-active:scale-95">
                    <Plus className="size-5 text-white" aria-hidden />
                  </div>
                )}
              </div>
            </motion.li>
          ))}

          {visibleItems.length === 0 && (
            <motion.li
              variants={prefersReducedMotion ? undefined : cardVariants}
              className="rounded-2xl bg-[#1C1C1E] py-16 text-center text-sm text-white/40"
            >
              Aucun plat dans cette catégorie.
            </motion.li>
          )}
        </motion.ul>
      </AnimatePresence>

      {/* ── Customization bottom sheet ─────────────────────── */}
      <ItemDialog
        key={selectedItem?.id ?? "none"}
        item={selectedItem}
        currency={restaurant.currency}
        onClose={() => setSelectedItem(null)}
      />

      {/* ── Floating cart bar ──────────────────────────────── */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            variants={prefersReducedMotion ? undefined : cartBarVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-x-4 bottom-5 z-40 mx-auto max-w-lg"
          >
            <Link
              href={`/${restaurant.slug}/checkout`}
              className="flex w-full items-center justify-between rounded-2xl bg-[#FF6B35] px-5 py-4 text-sm font-bold text-white shadow-2xl shadow-[#FF6B35]/40 transition-opacity hover:opacity-90"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                  {count}
                </span>
                <ShoppingBag className="size-4" />
                <span>Voir le panier</span>
              </span>
              <span className="font-bold">
                {formatPrice(subtotal, restaurant.currency)}
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Category Pill ──────────────────────────────────────────────────────────

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {active && (
        <motion.span
          layoutId="category-pill-bg"
          className="absolute inset-0 rounded-full bg-[#1C1C1E]"
          transition={{ type: "spring" as const, stiffness: 400, damping: 34 }}
        />
      )}
      <span
        className={`relative z-10 transition-colors duration-200 ${
          active ? "text-white" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {children}
      </span>
    </button>
  );
}
