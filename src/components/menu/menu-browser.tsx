"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Plus, ShoppingBag, Sparkles, UtensilsCrossed } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import type { Item, PublicMenu } from "@/lib/types";
import { ItemDialog } from "./item-dialog";

// ─── Editorial fallback photography ─────────────────────────────────────────
// Cards are always image-filled: when an item has no photo we cycle through a
// small set of curated plates so the grid never shows an empty tile.
const FALLBACK_IMAGES = [
  "/images/dish-1%201.png",
  "/images/dish-2%201.png",
  "/images/dish-3%201.png",
  "/images/dish-4.png",
] as const;

function fallbackImage(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length];
}

// ─── Animation Variants ────────────────────────────────────────────────────

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 26 },
  },
  exit: { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } },
};

const cartBarVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 320, damping: 28 },
  },
  exit: { opacity: 0, y: 28, scale: 0.94, transition: { duration: 0.18 } },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function MenuBrowser({
  menu,
  table,
  orderingEnabled = true,
}: {
  menu: PublicMenu;
  table: string | null;
  orderingEnabled?: boolean;
}) {
  const { restaurant, categories, items } = menu;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setContext, add, lines } = useCart();
  const prefersReducedMotion = useReducedMotion();

  // Defer motion styles until after hydration to avoid SSR mismatch.
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, []);

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

  function flashAdded(id: string) {
    setJustAdded(id);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(null), 1100);
  }

  function handleAdd(item: Item) {
    if (!orderingEnabled) return;
    if (item.customization_groups.length > 0) {
      setSelectedItem(item);
    } else {
      add({
        item_id: item.id,
        name: item.name_fr,
        unit_price: Number(item.base_price),
        options: [],
        image_url: item.image_url,
      });
      flashAdded(item.id);
    }
  }

  const animate = isHydrated && !prefersReducedMotion;

  return (
    <>
      {/* ── Category Tabs ─────────────────────────────────── */}
      <div className="sticky top-16 z-30 -mx-4 mt-5 overflow-x-auto bg-background/80 px-4 py-3 backdrop-blur-xl [scrollbar-width:none]">
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
      <motion.ul
        className="mt-8 grid grid-cols-1 gap-x-12 gap-y-1 sm:grid-cols-2 pb-36"
        variants={animate ? listVariants : undefined}
        initial={isHydrated ? "hidden" : false}
        animate="show"
      >
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, index) => {
            const src = item.image_url || fallbackImage(item.id);
            const wasAdded = justAdded === item.id;
            const isSignature = index === 0 && activeCategory === null;

            return (
              <motion.li
                key={item.id}
                layout="position"
                initial="hidden"
                animate="show"
                exit="exit"
                variants={prefersReducedMotion ? undefined : cardVariants}
                whileHover={animate ? { y: -2 } : undefined}
                whileTap={animate ? { scale: 0.985 } : undefined}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                suppressHydrationWarning
                className={`group relative mt-6 flex min-h-[190px] w-full flex-col justify-between overflow-visible rounded-[32px] bg-gradient-to-br from-white to-[#FF6B35]/15 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] border border-[#FF6B35]/10 dark:border-[#FF6B35]/20 dark:from-black/60 dark:to-[#FF6B35]/15 dark:shadow-none ${
                  item.in_stock ? "cursor-pointer" : "opacity-60 grayscale"
                }`}
                onClick={() => item.in_stock && orderingEnabled && setSelectedItem(item)}
              >
                {/* ── Floating Image Top Right ── */}
                <div className="absolute right-2 -top-6 z-10 flex size-[150px] items-center justify-center sm:right-4 sm:-top-8 sm:size-[180px]">
                  <div className="relative size-full transition-transform duration-500 group-hover:scale-110 drop-shadow-md">
                    <div className="relative size-full overflow-hidden rounded-full">
                      {src ? (
                        <Image
                          src={src}
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

                {/* ── Left Column: Text ── */}
                <div className="relative z-20 w-[65%] pr-6 sm:pr-8">
                  <div className="flex flex-col items-start gap-2">
                    <h3 className="font-display text-xl font-bold leading-tight text-foreground dark:text-white line-clamp-2">
                      {item.name_fr}
                    </h3>
                    {isSignature && item.in_stock && (
                      <span className="shrink-0 flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/30 dark:text-amber-500">
                        <Sparkles className="size-3" />
                        Signature
                      </span>
                    )}
                    {!item.in_stock && (
                      <span className="shrink-0 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                        Épuisé
                      </span>
                    )}
                  </div>
                  
                  {item.description_fr && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground dark:text-white/80">
                      {item.description_fr}
                    </p>
                  )}
                </div>

                {/* ── Bottom Actions (Price Left, Add Right) ── */}
                <div className="mt-4 flex w-full items-center justify-between z-20">
                  <span className="font-display text-xl font-black text-[#FF6B35]">
                    {formatPrice(item.base_price, restaurant.currency).replace(".00", "")}
                  </span>
                  
                  {item.in_stock && orderingEnabled && (
                    <motion.div
                      className="relative flex size-10 items-center justify-center rounded-full border-2 border-[#FF6B35] bg-transparent text-[#FF6B35] transition-colors group-hover:bg-[#FF6B35] group-hover:text-white"
                      animate={
                        animate && wasAdded ? { scale: [1, 1.15, 1] } : { scale: 1 }
                      }
                      transition={{ duration: 0.3 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(item);
                      }}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        {wasAdded ? (
                          <motion.span
                            key="check"
                            initial={animate ? { scale: 0, rotate: -30 } : false}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={animate ? { scale: 0 } : undefined}
                            transition={{ type: "spring", stiffness: 500, damping: 22 }}
                          >
                            <Check className="size-4" strokeWidth={3} />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="plus"
                            initial={animate ? { scale: 0 } : false}
                            animate={{ scale: 1 }}
                            exit={animate ? { scale: 0 } : undefined}
                            transition={{ type: "spring", stiffness: 500, damping: 22 }}
                          >
                            <Plus className="size-5" strokeWidth={2.5} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
              </motion.li>
            );
          })}

          {visibleItems.length === 0 && (
            <motion.li
              key="empty"
              layout="position"
              initial="hidden"
              animate="show"
              exit="exit"
              variants={prefersReducedMotion ? undefined : cardVariants}
              className="col-span-full flex flex-col items-center gap-3 rounded-[1.75rem] bg-card py-20 text-center ring-1 ring-border"
            >
              <UtensilsCrossed className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucun plat dans cette catégorie.
              </p>
            </motion.li>
          )}
        </AnimatePresence>
      </motion.ul>

      {/* ── Customization bottom sheet ─────────────────────── */}
      <ItemDialog
        key={selectedItem?.id ?? "none"}
        item={selectedItem}
        currency={restaurant.currency}
        onClose={() => setSelectedItem(null)}
      />

      {/* ── Floating cart bar ──────────────────────────────── */}
      <AnimatePresence>
        {orderingEnabled && count > 0 && (
          <motion.div
            variants={prefersReducedMotion ? undefined : cartBarVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-x-4 bottom-5 z-40 mx-auto max-w-lg"
          >
            <Link
              href={`/${restaurant.slug}/checkout`}
              className="group flex w-full items-center justify-between rounded-2xl bg-[#FF6B35] px-5 py-4 text-sm font-bold text-white shadow-2xl shadow-[#FF6B35]/40 ring-1 ring-white/20 transition-all hover:shadow-[#FF6B35]/55"
            >
              <span className="flex items-center gap-2.5">
                <motion.span
                  key={count}
                  initial={animate ? { scale: 0.5, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="flex size-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold tabular-nums"
                >
                  {count}
                </motion.span>
                <ShoppingBag className="size-4 transition-transform group-hover:-translate-y-0.5" />
                <span>Voir le panier</span>
              </span>
              <span className="font-bold tabular-nums">
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
          className="absolute inset-0 rounded-full bg-secondary shadow-sm"
          transition={{ type: "spring" as const, stiffness: 400, damping: 34 }}
        />
      )}
      <span
        className={`relative z-10 transition-colors duration-200 ${
          active
            ? "text-secondary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {children}
      </span>
    </button>
  );
}
