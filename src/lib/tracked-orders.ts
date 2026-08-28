"use client";

import { useState, useEffect } from "react";
import { TABLE_TTL_MS } from "@/store/cart";

// Lets a guest who ordered from a table QR find their order again without
// scanning anything or typing an id — modelled on seen-orders.ts (same
// storage-event pattern for cross-tab sync). One entry per (slug, table): a
// fresh order from the same table replaces the old one, so re-landing on the
// menu page always offers the CURRENT order, not a stack of past visits.
const STORAGE_KEY = "darna_tracked_orders";
const EVENT_NAME = "darna_tracked_orders_updated";

export type TrackedOrder = {
  id: string;
  slug: string;
  table: string | null;
  at: number; // epoch ms, set at checkout — same clock as cart.ts's table_set_at
};

// Exported for tests — same reasoning as cart.ts's isTableFresh: the
// freshness rule and the replace-by-(slug,table) logic below are pure, so
// they're tested directly rather than through localStorage, which this
// project's vitest config (environment: "node") has no DOM for.
export function isOrderFresh(entry: TrackedOrder, now = Date.now()) {
  return now - entry.at < TABLE_TTL_MS;
}

// Exported for tests. Guards against a hand-edited or partially-written
// payload the same way seen-orders.ts does — a malformed entry is dropped,
// not allowed to crash the read.
export function parseStoredOrders(raw: string | null): TrackedOrder[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is TrackedOrder =>
        e && typeof e.id === "string" && typeof e.slug === "string" && typeof e.at === "number",
    );
  } catch {
    return [];
  }
}

function readAll(): TrackedOrder[] {
  if (typeof window === "undefined") return [];
  return parseStoredOrders(localStorage.getItem(STORAGE_KEY));
}

function writeAll(entries: TrackedOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (e) {
    console.error(e);
  }
}

// Exported for tests: a fresh order from the same (slug, table) replaces the
// old one — a table turns over, and the next diner's order must not be
// shadowed by whatever the previous one left behind.
export function mergeTrackedOrder(
  existing: TrackedOrder[],
  next: TrackedOrder,
): TrackedOrder[] {
  return [
    ...existing.filter((e) => !(e.slug === next.slug && e.table === next.table)),
    next,
  ];
}

/** Called right after checkout succeeds — records this order as the current one for its (slug, table). */
export function trackOrder(order: { id: string; slug: string; table: string | null }) {
  if (typeof window === "undefined" || !order.id) return;
  writeAll(mergeTrackedOrder(readAll(), { ...order, at: Date.now() }));
}

export function forgetOrder(id: string) {
  if (typeof window === "undefined") return;
  writeAll(readAll().filter((e) => e.id !== id));
}

/** The live-ish order for this slug/table, or null if there isn't one — used to show the "your order is cooking" banner. */
export function useTrackedOrder(slug: string, table: string | null): TrackedOrder | null {
  const [entry, setEntry] = useState<TrackedOrder | null>(null);

  useEffect(() => {
    const read = () => {
      const found = readAll().find(
        (e) => e.slug === slug && e.table === table && isOrderFresh(e),
      );
      setEntry(found ?? null);
    };
    read();
    window.addEventListener(EVENT_NAME, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT_NAME, read);
      window.removeEventListener("storage", read);
    };
  }, [slug, table]);

  return entry;
}
