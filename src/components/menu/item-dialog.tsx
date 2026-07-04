"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import type { Item } from "@/lib/types";

// Option picker for items with customization_groups (sauces, sizes…).
export function ItemDialog({
  item,
  currency,
  onClose,
}: {
  item: Item | null;
  currency: string;
  onClose: () => void;
}) {
  // Mounted with a key per item (see MenuBrowser), so state starts fresh.
  const { add } = useCart();
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    let price = Number(item.base_price);
    for (const group of item.customization_groups) {
      for (const name of selected[group.title.fr] ?? []) {
        const opt = group.options.find((o) => o.name === name);
        if (opt) price += Number(opt.price_modifier);
      }
    }
    return price;
  }, [item, selected]);

  if (!item) return null;

  function toggle(groupTitle: string, optionName: string, max: number) {
    setSelected((prev) => {
      const current = prev[groupTitle] ?? [];
      if (current.includes(optionName)) {
        return { ...prev, [groupTitle]: current.filter((n) => n !== optionName) };
      }
      const next =
        max === 1 ? [optionName] : [...current, optionName].slice(-max);
      return { ...prev, [groupTitle]: next };
    });
  }

  function confirm() {
    const missing = item!.customization_groups.find(
      (g) => g.required && (selected[g.title.fr] ?? []).length === 0,
    );
    if (missing) {
      toast.error(`Veuillez choisir : ${missing.title.fr}`);
      return;
    }
    add(
      {
        item_id: item!.id,
        name: item!.name_fr,
        unit_price: unitPrice,
        options: Object.values(selected).flat(),
      },
      quantity,
    );
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{item.name_fr}</DialogTitle>
          {item.description_fr && (
            <DialogDescription>{item.description_fr}</DialogDescription>
          )}
        </DialogHeader>

        {item.customization_groups.map((group) => (
          <fieldset key={group.title.fr} className="space-y-2">
            <legend className="text-sm font-medium">
              {group.title.fr}
              {group.required && <span className="text-destructive"> *</span>}
              {group.max_selections > 1 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (max {group.max_selections})
                </span>
              )}
            </legend>
            <div className="space-y-1.5">
              {group.options.map((opt) => {
                const checked = (selected[group.title.fr] ?? []).includes(
                  opt.name,
                );
                return (
                  <label
                    key={opt.name}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type={group.max_selections === 1 ? "radio" : "checkbox"}
                        name={group.title.fr}
                        checked={checked}
                        onChange={() =>
                          toggle(group.title.fr, opt.name, group.max_selections)
                        }
                        className="accent-primary"
                      />
                      {opt.name}
                    </span>
                    {Number(opt.price_modifier) > 0 && (
                      <span className="text-muted-foreground">
                        +{formatPrice(opt.price_modifier, currency)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <DialogFooter className="flex-row items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-1 rounded-lg border">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Diminuer la quantité"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Augmenter la quantité"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <Button onClick={confirm} className="flex-1">
            Ajouter · {formatPrice(unitPrice * quantity, currency)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
