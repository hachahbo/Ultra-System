"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import type { Item, PublicMenu } from "@/lib/types";
import { ItemDialog } from "./item-dialog";

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

  // Bind the cart to this restaurant; a QR scan (?table=5) marks it dine-in.
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
      {/* Category tabs — horizontal scroll on mobile */}
      <div className="sticky top-16 z-30 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-background/95 px-4 py-3 backdrop-blur [scrollbar-width:none]">
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

      {/* Items */}
      <ul className="mt-4 space-y-3">
        {visibleItems.map((item) => (
          <li
            key={item.id}
            className={`flex items-center gap-4 rounded-xl bg-card p-3 ring-1 ring-border/60 ${
              item.in_stock ? "" : "opacity-55"
            }`}
          >
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name_fr}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center bg-accent text-accent-foreground">
                  <UtensilsCrossed className="size-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.name_fr}</p>
              {item.description_fr && (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {item.description_fr}
                </p>
              )}
              <p className="mt-1 font-semibold text-primary">
                {formatPrice(item.base_price, restaurant.currency)}
              </p>
            </div>
            {item.in_stock ? (
              <Button
                size="icon"
                aria-label={`Ajouter ${item.name_fr} au panier`}
                onClick={() => handleAdd(item)}
              >
                <Plus className="size-5" />
              </Button>
            ) : (
              <Badge variant="outline">Épuisé</Badge>
            )}
          </li>
        ))}
        {visibleItems.length === 0 && (
          <li className="py-12 text-center text-sm text-muted-foreground">
            Aucun plat dans cette catégorie.
          </li>
        )}
      </ul>

      {/* Customization dialog */}
      <ItemDialog
        key={selectedItem?.id ?? "none"}
        item={selectedItem}
        currency={restaurant.currency}
        onClose={() => setSelectedItem(null)}
      />

      {/* Sticky cart bar */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <Button asChild size="lg" className="w-full justify-between">
              <Link href={`/${restaurant.slug}/checkout`}>
                <span className="inline-flex items-center gap-2">
                  <ShoppingBag className="size-5" />
                  {count} article{count > 1 ? "s" : ""}
                </span>
                <span>
                  Voir le panier · {formatPrice(subtotal, restaurant.currency)}
                </span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

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
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-secondary text-secondary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
