"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Plus, ShoppingBag, Sparkles, UtensilsCrossed, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import type { Item, PublicMenu } from "@/lib/types";
import { ItemDialog } from "./item-dialog";

interface DetailRow {
  name: string;
  desc?: string;
  price?: string;
}

interface ItemDetails {
  expandTitle: string;
  expandSub: string;
  sectionLabel: string;
  rows: DetailRow[];
}

// ─── Editorial fallback photography ─────────────────────────────────────────
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

// Helper to retrieve authentic tangerine ingredients or customization groups
function getItemDetails(item: Item): ItemDetails {
  const name = item.name_fr.toLowerCase();

  if (name.includes("potatoes")) {
    return {
      expandTitle: "Composition",
      expandSub: "Notre grand classique, servi croustillant.",
      sectionLabel: "INGRÉDIENTS",
      rows: [
        { name: "Pommes de terre grelot" },
        { name: "Beurre noisette & thym" },
        { name: "Fleur de sel de Tanger" }
      ]
    };
  }
  if (name.includes("grecque") || name.includes("greek")) {
    return {
      expandTitle: "Composition",
      expandSub: "Fraîcheur du marché, assaisonnée minute.",
      sectionLabel: "INGRÉDIENTS",
      rows: [
        { name: "Tomates & concombres" },
        { name: "Féta AOP & olives Kalamata" },
        { name: "Origan, huile d'olive vierge" }
      ]
    };
  }
  if (name.includes("boeuf") || name.includes("bœuf") || name.includes("filet")) {
    return {
      expandTitle: "Composition",
      expandSub: "Pièce maîtresse de la maison.",
      sectionLabel: "INGRÉDIENTS",
      rows: [
        { name: "Filet de bœuf 220g" },
        { name: "Crème d'épinards au parmesan" },
        { name: "Potatoes maison" }
      ]
    };
  }
  if (name.includes("fruits") || name.includes("fruit salad")) {
    return {
      expandTitle: "Composition",
      expandSub: "Le dessert le plus léger de la carte.",
      sectionLabel: "INGRÉDIENTS",
      rows: [
        { name: "Fruits de saison" },
        { name: "Sirop de menthe fraîche" },
        { name: "Zeste de citron vert" }
      ]
    };
  }
  if (name.includes("linguine") || name.includes("pasta")) {
    return {
      expandTitle: "Composition",
      expandSub: "Sauce mijotée trois heures.",
      sectionLabel: "INGRÉDIENTS",
      rows: [
        { name: "Linguine fraîches" },
        { name: "Tomates San Marzano" },
        { name: "Basilic & parmesan 24 mois" }
      ]
    };
  }
  if (name.includes("carpaccio")) {
    return {
      expandTitle: "Composition",
      expandSub: "Tranché à la commande.",
      sectionLabel: "INGRÉDIENTS",
      rows: [
        { name: "Bœuf tranché finement" },
        { name: "Vinaigrette à la truffe" },
        { name: "Copeaux de parmesan & roquette" }
      ]
    };
  }
  if (name.includes("tiramisu")) {
    return {
      expandTitle: "Composition",
      expandSub: "Reposé 24h avant le service.",
      sectionLabel: "INGRÉDIENTS",
      rows: [
        { name: "Mascarpone & œufs fermiers" },
        { name: "Espresso de spécialité" },
        { name: "Cacao amer" }
      ]
    };
  }

  // Fallback to customization groups if options exist
  if (item.customization_groups && item.customization_groups.length > 0) {
    return {
      expandTitle: "Personnalisation",
      expandSub: "Options à choisir pour accompagner votre plat.",
      sectionLabel: "OPTIONS DISPONIBLES",
      rows: item.customization_groups.map(group => ({
        name: group.title.fr,
        desc: group.options.map(o => `${o.name} (${o.price_modifier > 0 ? `+${o.price_modifier} MAD` : "Gratuit"})`).join(", ")
      }))
    };
  }

  return {
    expandTitle: "Détails du plat",
    expandSub: "Préparé avec soin par notre chef.",
    sectionLabel: "INFORMATIONS",
    rows: [
      { name: "Ingrédients de saison" },
      { name: "Fait maison minute" }
    ]
  };
}

// ─── Animation Variants ────────────────────────────────────────────────────
const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 1, y: 24, scale: 0.98 },
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
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
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

  const toggleExpand = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

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
            const isExpanded = !!expandedItems[item.id];
            const details = getItemDetails(item);

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
                className={`group relative mt-10 flex min-h-[220px] w-full flex-col justify-between overflow-visible rounded-[22px] bg-card border border-border/10 dark:border-border/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300 ${item.in_stock ? "cursor-pointer" : "opacity-60 grayscale"
                  }`}
                onClick={() => item.in_stock && orderingEnabled && setSelectedItem(item)}
              >
                {/* ── Floating Image Top Right (Strictly Matching the 118px Oval Style) ── */}
                <div className="absolute right-6 -top-[34px] z-10 size-[118px] rounded-full border-[3px] border-card overflow-hidden shadow-[0_14px_34px_rgba(0,0,0,0.5)]">
                  <div className="relative size-full transition-transform duration-500 group-hover:scale-110">
                    {src ? (
                      <Image
                        src={src}
                        alt={item.name_fr}
                        fill
                        sizes="200px"
                        className="object-cover scale-[1.30]"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-accent text-accent-foreground">
                        <UtensilsCrossed className="size-6" />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Left Column: Text (62% width limit to clear floating circle) ── */}
                <div className="relative z-20 w-[62%] pr-4 flex-grow flex flex-col justify-start">
                  <div className="flex flex-col items-start gap-2">
                    <h3 className="font-serif text-[22px] font-semibold leading-tight text-foreground line-clamp-2">
                      {item.name_fr}
                    </h3>
                    {isSignature && item.in_stock && (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-[#FF6B35]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FF6B35]">
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
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description_fr}
                    </p>
                  )}
                </div>

                {/* ── Bottom Actions (Price Left, Add + Chevron Right) ── */}
                <div className="mt-6 flex w-full items-center justify-between z-20">
                  <span className="font-display text-2xl font-extrabold text-[#FF6B35]">
                    {formatPrice(item.base_price, restaurant.currency)}
                  </span>

                  <div className="flex items-center gap-3">
                    {item.in_stock && orderingEnabled && (
                      <motion.button
                        className="relative flex size-[42px] items-center justify-center rounded-full border-[1.5px] border-[#FF6B35] bg-transparent text-[#FF6B35] transition-colors duration-200 hover:bg-[#FF6B35] hover:text-white cursor-pointer"
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
                      </motion.button>
                    )}

                    {/* Accordion Expansion Toggle chevron */}
                    <button
                      onClick={(e) => toggleExpand(item.id, e)}
                      aria-label="Détails"
                      className={`flex size-[42px] items-center justify-center rounded-full border border-border/40 bg-transparent text-foreground hover:bg-muted/30 cursor-pointer transition-transform duration-300 ${isExpanded ? "rotate-180" : ""
                        }`}
                    >
                      <ChevronDown className="size-5" />
                    </button>
                  </div>
                </div>

                {/* ── Inline Customization / Composition Accordion ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden bg-gradient-to-br from-[#fdf1e7] to-[#fadfc3] dark:from-[#141416] dark:to-[#24130b] text-[#1b2437] dark:text-stone-200 rounded-[28px] -mx-6 -mb-6 mt-6"
                      onClick={(e) => e.stopPropagation()} // Prevent modal trigger inside details
                    >
                      <div className="p-[30px] pt-7">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-serif font-bold text-[24px] text-[#1b2437] dark:text-amber-500 leading-tight">
                              {details.expandTitle}
                            </div>
                            <div className="text-xs font-semibold text-[#42506b] dark:text-stone-400 mt-2 flex items-center gap-1.5">
                              {details.expandSub}
                              <svg width="14" height="8" viewBox="0 0 18 10" fill="#FF6B35" className="inline shrink-0">
                                <path d="M0 10a9 9 0 0 1 18 0z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="h-[1.5px] bg-[#1b2437]/20 dark:bg-stone-700/60 my-4" />
                        <div className="text-[11px] font-black tracking-[0.25em] text-[#1b2437]/60 dark:text-stone-400 uppercase mb-4">
                          {details.sectionLabel}
                        </div>
                        <div className="flex flex-col gap-3">
                          {details.rows.map((row, rIdx) => (
                            <div key={rIdx} className="pb-3 border-b border-[#1b2437]/10 dark:border-stone-700/30 last:border-b-0 last:pb-0">
                              <div className="flex justify-between items-baseline gap-4">
                                <span className="font-bold text-sm text-[#1b2437] dark:text-stone-200">{row.name}</span>
                                {row.price && (
                                  <span className="font-bold text-sm text-[#1b2437] dark:text-amber-500 whitespace-nowrap">{row.price} MAD</span>
                                )}
                              </div>
                              {row.desc && (
                                <p className="text-xs text-[#42506b] dark:text-stone-400 mt-1 leading-relaxed">{row.desc}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              className="group flex w-full items-center justify-between rounded-full bg-[#FF6B35]/30 backdrop-blur-md px-6 py-4 text-base font-semibold text-white shadow-[0_8px_32px_rgba(255,107,53,0.1)] ring-1 ring-white/10 transition-all duration-300 hover:bg-[#FF6B35] hover:shadow-[0_16px_44px_rgba(255,107,53,0.4)] hover:scale-[1.01]"
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
      className="relative shrink-0 cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-200"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {active && (
        <motion.span
          layoutId="category-pill-bg"
          className="absolute inset-0 rounded-full bg-[#27272a]/10 dark:bg-neutral-800 shadow-sm"
          transition={{ type: "spring" as const, stiffness: 400, damping: 34 }}
        />
      )}
      <span
        className={`relative z-10 transition-colors duration-200 ${active
            ? "text-[#FF6B35] dark:text-[#FF6B35] font-bold"
            : "text-muted-foreground hover:text-foreground"
          }`}
      >
        {children}
      </span>
    </button>
  );
}
