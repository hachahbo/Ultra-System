"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  Minus,
  Plus,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { toast } from "sonner";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import type { CustomizationGroup, Item } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Set of base-ingredient names that the customer wants removed. */
type RemovedIngredients = Set<string>;

// A CustomizationGroup whose title.fr === "Ingrédients" is treated as the
// ingredient composition section — rendered as Inclus/Sans toggles instead of
// standard option pickers. Price impact is always 0.
const INGREDIENTS_GROUP_KEY = "Ingrédients";

// ─── Animation Variants ─────────────────────────────────────────────────────

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const sheetVariants: Variants = {
  hidden: { y: "100%" },
  show: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 340, damping: 40 },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.24, ease: [0.4, 0, 0.6, 1] as const },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.22 },
  }),
};

/** When reduced-motion is preferred, return undefined so motion elements animate instantly. */
function v(reduced: boolean | null, variants: Variants): Variants | undefined {
  return reduced ? undefined : variants;
}

// ─── ItemDialog ─────────────────────────────────────────────────────────────

/**
 * Premium bottom-sheet modifier for items with customization_groups.
 *
 * Layout is split into two editorial sections:
 *  1. Standard modifiers (price-impacting choices, upsells)
 *  2. Ingredient Composition — groups titled "Ingrédients" rendered as
 *     Inclus / Sans toggles, synced to cart as "Sans <name>" option strings.
 */
export function ItemDialog({
  item,
  currency,
  onClose,
}: {
  item: Item | null;
  currency: string;
  onClose: () => void;
}) {
  const { add } = useCart();
  const prefersReducedMotion = useReducedMotion();

  // Standard option selections: { groupTitle: optionName[] }
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  // Removed base ingredients
  const [removed, setRemoved] = useState<RemovedIngredients>(new Set());
  const [quantity, setQuantity] = useState(1);

  // Split groups into standard vs ingredient composition
  const { standardGroups, ingredientGroup } = useMemo(() => {
    if (!item) return { standardGroups: [], ingredientGroup: null };
    const standard: CustomizationGroup[] = [];
    let ingredient: CustomizationGroup | null = null;
    for (const g of item.customization_groups) {
      if (g.title.fr === INGREDIENTS_GROUP_KEY) ingredient = g;
      else standard.push(g);
    }
    return { standardGroups: standard, ingredientGroup: ingredient };
  }, [item]);

  // Computed unit price (standard options only — ingredient removal is free)
  const unitPrice = useMemo(() => {
    if (!item) return 0;
    let price = Number(item.base_price);
    for (const group of standardGroups) {
      for (const name of selected[group.title.fr] ?? []) {
        const opt = group.options.find((o) => o.name === name);
        if (opt) price += Number(opt.price_modifier);
      }
    }
    return price;
  }, [item, selected, standardGroups]);

  const toggleOption = useCallback(
    (groupTitle: string, optionName: string, max: number) => {
      setSelected((prev) => {
        const current = prev[groupTitle] ?? [];
        if (current.includes(optionName)) {
          return { ...prev, [groupTitle]: current.filter((n) => n !== optionName) };
        }
        const next = max === 1 ? [optionName] : [...current, optionName].slice(-max);
        return { ...prev, [groupTitle]: next };
      });
    },
    [],
  );

  const toggleIngredient = useCallback((name: string) => {
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  function confirm() {
    const missing = standardGroups.find(
      (g) => g.required && (selected[g.title.fr] ?? []).length === 0,
    );
    if (missing) {
      toast.error(`Veuillez choisir : ${missing.title.fr}`);
      return;
    }

    // Merge standard options + removed ingredient strings
    const allOptions = [
      ...Object.values(selected).flat(),
      ...[...removed].map((i) => `Sans ${i}`),
    ];

    add(
      {
        item_id: item!.id,
        name: item!.name_fr,
        unit_price: unitPrice,
        options: allOptions,
      },
      quantity,
    );
    onClose();
  }

  const isOpen = item !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            variants={v(prefersReducedMotion, backdropVariants)}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Bottom Sheet ── */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={item.name_fr}
            variants={v(prefersReducedMotion, sheetVariants)}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl"
          >
            {/* ── Drag handle ── */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {/* ── Header image ── */}
            {item.image_url && (
              <div className="relative mx-4 mt-2 h-44 shrink-0 overflow-hidden rounded-2xl">
                <Image
                  src={item.image_url}
                  alt={item.name_fr}
                  fill
                  sizes="(max-width: 640px) 100vw, 640px"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            )}

            {/* ── Close button ── */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-4 top-4 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-muted"
            >
              <X className="size-4" />
            </button>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Item title + description */}
              <div className="mb-5">
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                  {item.name_fr}
                </h2>
                {item.description_fr && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.description_fr}
                  </p>
                )}
                <p className="mt-2 text-base font-bold text-primary">
                  {formatPrice(item.base_price, currency)}
                </p>
              </div>

              {/* ── Section 1: Standard Modifiers ── */}
              {standardGroups.length > 0 && (
                <div className="space-y-5">
                  {standardGroups.map((group, i) => (
                    <motion.fieldset
                      key={group.title.fr}
                      custom={i}
                      variants={v(prefersReducedMotion, sectionVariants)}
                      initial="hidden"
                      animate="show"
                      className="space-y-2"
                    >
                      <legend className="flex w-full items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          {group.title.fr}
                          {group.required && (
                            <span className="ml-1 text-primary">*</span>
                          )}
                        </span>
                        {group.max_selections > 1 && (
                          <span className="text-[10px] text-muted-foreground">
                            max {group.max_selections}
                          </span>
                        )}
                      </legend>

                      <div className="space-y-1.5">
                        {group.options.map((opt) => {
                          const checked = (
                            selected[group.title.fr] ?? []
                          ).includes(opt.name);
                          return (
                            <label
                              key={opt.name}
                              className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-150 ${
                                checked
                                  ? "border-primary/60 bg-primary/5 text-foreground"
                                  : "border-border hover:border-border/80 hover:bg-muted/40"
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <span
                                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                    checked
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background"
                                  }`}
                                >
                                  {checked && <Check className="size-3" />}
                                </span>
                                <input
                                  type={
                                    group.max_selections === 1
                                      ? "radio"
                                      : "checkbox"
                                  }
                                  name={group.title.fr}
                                  checked={checked}
                                  onChange={() =>
                                    toggleOption(
                                      group.title.fr,
                                      opt.name,
                                      group.max_selections,
                                    )
                                  }
                                  className="sr-only"
                                />
                                {opt.name}
                              </span>
                              {Number(opt.price_modifier) > 0 && (
                                <span className="text-xs font-medium text-muted-foreground">
                                  +{formatPrice(opt.price_modifier, currency)}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </motion.fieldset>
                  ))}
                </div>
              )}

              {/* ── Section 2: Ingredient Composition ── */}
              {ingredientGroup && (
                <motion.section
                  custom={standardGroups.length}
                  variants={v(prefersReducedMotion, sectionVariants)}
                  initial="hidden"
                  animate="show"
                  className="mt-6"
                >
                  {/* Section header */}
                  <div className="mb-3 flex items-center gap-2">
                    <UtensilsCrossed className="size-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Composition des ingrédients
                    </span>
                  </div>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Retirez les ingrédients que vous ne souhaitez pas.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {ingredientGroup.options.map((opt) => {
                      const isRemoved = removed.has(opt.name);
                      return (
                        <button
                          key={opt.name}
                          type="button"
                          onClick={() => toggleIngredient(opt.name)}
                          className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                            isRemoved
                              ? "border-destructive/60 bg-destructive/8 text-destructive line-through opacity-80"
                              : "border-border bg-background text-foreground hover:border-border/60 hover:bg-muted/50"
                          }`}
                        >
                          {isRemoved ? (
                            <span className="flex items-center gap-1">
                              <X className="size-3" />
                              Sans {opt.name}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Check className="size-3 text-green-600" />
                              {opt.name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {removed.size > 0 && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Retiré :{" "}
                      <span className="font-medium text-destructive">
                        {[...removed].map((n) => `Sans ${n}`).join(", ")}
                      </span>
                    </p>
                  )}
                </motion.section>
              )}

              {/* spacer for footer */}
              <div className="h-4" />
            </div>

            {/* ── Sticky footer ── */}
            <div className="shrink-0 border-t border-border/60 bg-card px-5 pb-safe pt-3">
              <div className="flex items-center gap-3">
                {/* Quantity stepper */}
                <div className="flex items-center rounded-xl border border-border">
                  <button
                    type="button"
                    aria-label="Diminuer la quantité"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex size-10 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Augmenter la quantité"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="flex size-10 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                {/* Add to cart */}
                <button
                  type="button"
                  onClick={confirm}
                  className="flex flex-1 cursor-pointer items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  Ajouter · {formatPrice(unitPrice * quantity, currency)}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
