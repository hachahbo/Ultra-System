"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  key: string; // item_id + sorted options — merges identical picks
  item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  options: string[];
  image_url?: string | null;
};

type CartState = {
  slug: string | null;
  table: string | null; // set from ?table= QR param (dine-in)
  lines: CartLine[];
  setContext: (slug: string, table?: string | null) => void;
  add: (line: Omit<CartLine, "key" | "quantity">, quantity?: number) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      slug: null,
      table: null,
      lines: [],

      setContext: (slug, table) =>
        set((s) => ({
          slug,
          // one cart per restaurant: switching slug drops the old cart
          lines: s.slug === slug ? s.lines : [],
          table: table !== undefined ? table : s.slug === slug ? s.table : null,
        })),

      add: (line, quantity = 1) => {
        const key = `${line.item_id}::${[...line.options].sort().join("|")}`;
        const lines = [...get().lines];
        const existing = lines.find((l) => l.key === key);
        if (existing) existing.quantity += quantity;
        else lines.push({ ...line, key, quantity });
        set({ lines });
      },

      increment: (key) =>
        set({
          lines: get().lines.map((l) =>
            l.key === key ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        }),

      decrement: (key) =>
        set({
          lines: get()
            .lines.map((l) =>
              l.key === key ? { ...l, quantity: l.quantity - 1 } : l,
            )
            .filter((l) => l.quantity > 0),
        }),

      clear: () => set({ lines: [], table: null }),
    }),
    { name: "darna-cart" },
  ),
);

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
}
