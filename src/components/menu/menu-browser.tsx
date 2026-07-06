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
}: {
  menu: PublicMenu;
  table: string | null;
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
    if (item.customization_groups.length > 0) {
      setSelectedItem(item);
    } else {
      add({
        item_id: item.id,
        name: item.name_fr,
        unit_price: Number(item.base_price),
        options: [],
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
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.ul
          key={activeCategory ?? "all"}
          className="mt-5 grid grid-cols-1 gap-4 pb-36 sm:grid-cols-2"
          variants={animate ? listVariants : undefined}
          initial={isHydrated ? "hidden" : false}
          animate="show"
        >
          {visibleItems.map((item, index) => {
            const src = item.image_url || fallbackImage(item.id);
            const wasAdded = justAdded === item.id;
            const isSignature = index === 0 && activeCategory === null;

            return (
              <motion.li
                key={item.id}
                variants={prefersReducedMotion ? undefined : cardVariants}
                whileHover={animate ? { y: -5 } : undefined}
                whileTap={animate ? { scale: 0.985 } : undefined}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                suppressHydrationWarning
                className={`group relative isolate flex h-72 flex-col justify-end overflow-hidden rounded-[1.75rem] shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/10 sm:h-80 ${
                  item.in_stock ? "cursor-pointer" : "opacity-60 grayscale"
                }`}
                onClick={() => item.in_stock && handleAdd(item)}
              >
                {/* ── Full-bleed dish photography ── */}
                <div className="absolute inset-0 -z-10 bg-[#141416]">
                  <Image
                    src={src}
                    alt={item.name_fr}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 336px"
                    className="object-cover transition-transform duration-[900ms] ease-out will-change-transform group-hover:scale-[1.08]"
                  />
                  {/* Cinematic legibility gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/30" />
                </div>

                {/* ── Top row: signature / stock badges ── */}
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
                  {isSignature && item.in_stock ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md ring-1 ring-white/20">
                      <Sparkles className="size-3 text-[#FFB347]" />
                      Signature
                    </span>
                  ) : (
                    <span />
                  )}
                  {!item.in_stock && (
                    <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/70 backdrop-blur-sm">
                      Épuisé
                    </span>
                  )}
                </div>

                {/* ── Bottom: editorial content over the image ── */}
                <div className="relative flex items-end justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold leading-tight tracking-tight text-white drop-shadow-sm">
                      {item.name_fr}
                    </h3>
                    {item.description_fr && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/60">
                        {item.description_fr}
                      </p>
                    )}
                    <p className="mt-2.5 text-lg font-bold tracking-tight text-[#FF8A5B]">
                      {formatPrice(item.base_price, restaurant.currency)}
                    </p>
                  </div>

                  {/* ── Springy add FAB (Plus ⇄ Check) ── */}
                  {item.in_stock && (
                    <motion.div
                      className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FF6B35] shadow-lg shadow-[#FF6B35]/40 ring-1 ring-white/20"
                      animate={
                        animate && wasAdded ? { scale: [1, 1.18, 1] } : { scale: 1 }
                      }
                      transition={{ duration: 0.4, ease: "easeOut" }}
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
                            <Check className="size-5 text-white" strokeWidth={3} />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="plus"
                            initial={animate ? { scale: 0 } : false}
                            animate={{ scale: 1 }}
                            exit={animate ? { scale: 0 } : undefined}
                            transition={{ type: "spring", stiffness: 500, damping: 22 }}
                          >
                            <Plus className="size-5 text-white" aria-hidden />
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
              variants={prefersReducedMotion ? undefined : cardVariants}
              className="col-span-full flex flex-col items-center gap-3 rounded-[1.75rem] bg-card py-20 text-center ring-1 ring-border"
            >
              <UtensilsCrossed className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucun plat dans cette catégorie.
              </p>
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
