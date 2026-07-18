"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatPrice } from "@/lib/format";
import type { Category, Item, Promotion } from "@/lib/types";

// "Nos formules" — combo deals (e.g. "Menu Smart": pick N items from a
// category, fixed total price). Each promotion's `rules` reference a
// category_id + how many items to pick from it; eligible items are those
// with is_smart_menu_eligible = true in that category.
export function FormulesSection({
  promotions,
  categories,
  items,
  currency,
}: {
  promotions: Promotion[];
  categories: Category[];
  items: Item[];
  currency: string;
}) {
  const [openId, setOpenId] = useState<string | null>(promotions[0]?.id ?? null);

  if (promotions.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl font-semibold tracking-tight">Nos formules</h2>
      <div className="mt-5 flex flex-col gap-4">
        {promotions.map((promotion) => {
          const isOpen = openId === promotion.id;
          return (
            <div
              key={promotion.id}
              className="overflow-hidden rounded-[1.75rem] bg-card ring-1 ring-border"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : promotion.id)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <div>
                  <div className="font-display text-lg font-semibold tracking-tight">
                    {promotion.name}
                  </div>
                  {promotion.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {promotion.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-display text-lg font-black text-primary">
                    {formatPrice(promotion.price, currency).replace(".00", "")}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"
                  >
                    <ChevronDown className="size-4" />
                  </motion.span>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-4 px-6 pb-6">
                      {promotion.rules.map((rule, i) => {
                        const category = categories.find((c) => c.id === rule.category_id);
                        const eligible = items.filter(
                          (item) =>
                            item.category_id === rule.category_id &&
                            item.is_smart_menu_eligible,
                        );
                        return (
                          <div key={i} className="border-t border-border pt-4 first:border-0 first:pt-0">
                            <div className="text-sm font-bold">
                              {rule.count} × {category?.name_fr ?? "Catégorie"}
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                              {eligible.length > 0
                                ? eligible.map((item) => item.name_fr).join(", ")
                                : "Aucun plat éligible pour le moment."}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
