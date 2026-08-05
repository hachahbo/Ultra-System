"use client";

import { useEffect, useState } from "react";
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

// What /api/promo-codes/validate confirmed is applicable. Only the type/value
// are kept (not a frozen discount amount) — cartDiscount() below recomputes
// against the live subtotal so the shown discount stays correct as the cart
// changes. The server re-validates everything from the DB again at order
// submission regardless — this is display-only.
export type CartPromo = {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
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
  promo: CartPromo | null;
  setContext: (slug: string, table?: string | null) => void;
  add: (line: Omit<CartLine, "key" | "quantity">, quantity?: number) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  applyPromo: (promo: CartPromo) => void;
  clearPromo: () => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      slug: null,
      table: null,
      table_set_at: null,
      lines: [],
      promo: null,

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
            // A code belongs to the restaurant that issued it — carrying it
            // across a slug switch would silently apply restaurant A's promo
            // to restaurant B's order.
            promo: sameSlug ? s.promo : null,
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

      applyPromo: (promo) => set({ promo }),
      clearPromo: () => set({ promo: null }),

      clear: () => set({ lines: [], table: null, table_set_at: null, promo: null }),
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

/** True only after Zustand has rehydrated the persisted cart from localStorage. */
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // useCart.persist.hasHydrated() is set synchronously during the first
    // render if storage was already available, but in practice it fires
    // in a microtask after mount. Listening to the onFinishHydration event
    // is the safest cross-browser approach.
    const unsub = useCart.persist.onFinishHydration(() => setHydrated(true));
    // Already hydrated before this component mounted (common on fast devices).
    if (useCart.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
}

// Display-only estimate of a promo's discount against the current subtotal
// — clamped so it never exceeds it (a fixed discount larger than the cart
// shouldn't show a negative total). The server is the actual authority; see
// evaluatePromoCode in src/lib/promo.ts for the version it re-checks against.
export function cartDiscount(subtotal: number, promo: CartPromo | null): number {
  if (!promo) return 0;
  const raw =
    promo.discount_type === "percentage"
      ? subtotal * (promo.discount_value / 100)
      : promo.discount_value;
  return Math.round(Math.min(Math.max(raw, 0), subtotal) * 100) / 100;
}
