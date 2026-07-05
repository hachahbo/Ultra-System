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
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: { opacity: 0, y: 15, transition: { duration: 0.18 } },
};

const cartBarVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.16 },
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
      <div className="sticky top-16 z-30 -mx-4 mt-6 overflow-x-auto bg-background/90 px-4 py-3 backdrop-blur-md [scrollbar-width:none]">
        <div className="flex gap-2 w-max">
          <CategoryPill
            id="all"
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          >
            Tout
          </CategoryPill>
          {categories.map((c) => (
            <CategoryPill
              key={c.id}
              id={c.id}
              active={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.name_fr}
            </CategoryPill>
          ))}
        </div>
      </div>

      {/* ── Item Grid ─────────────────────────────────────── */}
      <AnimatePresence mode="popLayout">
        <motion.ul
          key={activeCategory ?? "all"}
          className="mt-5 space-y-3 pb-28"
          variants={prefersReducedMotion ? {} : listVariants}
          initial="hidden"
          animate="show"
        >
          {visibleItems.map((item) => (
            <motion.li
              key={item.id}
              variants={prefersReducedMotion ? {} : cardVariants}
              layout
              className={`group relative flex items-stretch gap-0 overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-shadow duration-200 hover:shadow-md hover:ring-border ${
                item.in_stock ? "cursor-pointer" : "opacity-55"
              }`}
              onClick={() => item.in_stock && handleAdd(item)}
            >
              {/* ── Image ── */}
              <div className="relative w-24 shrink-0 sm:w-28">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name_fr}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-accent text-accent-foreground">
                    <UtensilsCrossed className="size-6 opacity-50" />
                  </div>
                )}
              </div>

              {/* ── Content ── */}
              <div className="flex flex-1 flex-col justify-between gap-1 px-4 py-3">
                <div>
                  <p className="font-semibold leading-snug tracking-tight text-foreground">
                    {item.name_fr}
                  </p>
                  {item.description_fr && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.description_fr}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">
                    {formatPrice(item.base_price, restaurant.currency)}
                  </span>
                  {item.in_stock ? (
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-150 group-hover:scale-110">
                      <Plus className="size-4" aria-hidden />
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Épuisé
                    </Badge>
                  )}
                </div>
              </div>
            </motion.li>
          ))}

          {visibleItems.length === 0 && (
            <motion.li
              variants={prefersReducedMotion ? {} : cardVariants}
              className="py-16 text-center text-sm text-muted-foreground"
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
            variants={prefersReducedMotion ? {} : cartBarVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-lg"
          >
            <Link
              href={`/${restaurant.slug}/checkout`}
              className="flex w-full items-center justify-between rounded-2xl bg-foreground px-5 py-3.5 text-sm font-semibold text-background shadow-xl transition-opacity hover:opacity-90"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="size-4" />
                {count} article{count > 1 ? "s" : ""}
              </span>
              <span>
                {formatPrice(subtotal, restaurant.currency)} &rarr;
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
  id,
  active,
  onClick,
  children,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {active && (
        <motion.span
          layoutId="category-pill-bg"
          className="absolute inset-0 rounded-full bg-foreground"
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      )}
      <span
        className={`relative z-10 transition-colors duration-200 ${
          active ? "text-background" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {children}
      </span>
    </button>
  );
}
