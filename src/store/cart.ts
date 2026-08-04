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

// A scanned table goes stale after this long. Comfortably longer than a meal,
// short enough that reopening the site from home days later doesn't still
// order to table 5. Enforced on rehydrate — see `merge` below.
export const TABLE_TTL_MS = 4 * 60 * 60 * 1000;

// Exported for tests: the persisted table is only trusted inside the TTL.
// Carts persisted before this shipped have no timestamp and read as stale.
export function isTableFresh(setAt: unknown, now = Date.now()) {
  return typeof setAt === "number" && now - setAt < TABLE_TTL_MS;
}

type CartState = {
  slug: string | null;
  table: string | null; // set from ?table= QR param (dine-in)
  table_set_at: number | null; // epoch ms of the scan that set `table`
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
      table_set_at: null,
      lines: [],

      setContext: (slug, table) => {
        set((s) => {
          const sameSlug = s.slug === slug;
          // `undefined` means the URL carried no ?table= — the stored table
          // rides along so an in-restaurant link doesn't drop dine-in mid-meal.
          const nextTable = table !== undefined ? table : sameSlug ? s.table : null;
          const scanned = table !== undefined && table !== null;
          return {
            slug,
            // one cart per restaurant: switching slug drops the old cart
            lines: sameSlug ? s.lines : [],
            table: nextTable,
            // An explicit ?table= restamps the clock (they're still at the
            // table); an inherited one keeps the original scan time.
            table_set_at: !nextTable
              ? null
              : scanned
                ? Date.now()
                : (s.table_set_at ?? Date.now()),
          };
        });
      },

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

      clear: () => set({ lines: [], table: null, table_set_at: null }),
    }),
    {
      name: "darna-cart",
      // Expire a stale table at hydration, before any component reads it.
      // Carts persisted before 0028 have no timestamp and so lose their
      // table once — correct, since we can't tell how old the scan was.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<CartState>;
        const fresh = isTableFresh(saved.table_set_at);
        return {
          ...current,
          ...saved,
          table: fresh ? (saved.table ?? null) : null,
          table_set_at: fresh ? (saved.table_set_at ?? null) : null,
        };
      },
    },
  ),
);

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
}
