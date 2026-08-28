import { describe, expect, it } from "vitest";
import { TABLE_TTL_MS } from "@/store/cart";
import {
  isOrderFresh,
  mergeTrackedOrder,
  parseStoredOrders,
  type TrackedOrder,
} from "@/lib/tracked-orders";

const now = 1_700_000_000_000;

function makeOrder(overrides: Partial<TrackedOrder> = {}): TrackedOrder {
  return { id: "order-1", slug: "orendezvous", table: "4", at: now, ...overrides };
}

describe("isOrderFresh", () => {
  it("trusts an order tracked just now", () => {
    expect(isOrderFresh(makeOrder({ at: now }), now)).toBe(true);
  });

  it("trusts an order tracked mid-meal", () => {
    expect(isOrderFresh(makeOrder({ at: now - 90 * 60 * 1000 }), now)).toBe(true);
  });

  it("drops an order once the TTL has elapsed", () => {
    expect(isOrderFresh(makeOrder({ at: now - TABLE_TTL_MS }), now)).toBe(false);
    expect(isOrderFresh(makeOrder({ at: now - TABLE_TTL_MS - 1 }), now)).toBe(false);
  });

  it("drops an order tracked days ago", () => {
    expect(isOrderFresh(makeOrder({ at: now - 3 * 24 * 60 * 60 * 1000 }), now)).toBe(false);
  });
});

describe("mergeTrackedOrder", () => {
  it("appends when nothing exists for this (slug, table) yet", () => {
    const result = mergeTrackedOrder([], makeOrder());
    expect(result).toEqual([makeOrder()]);
  });

  it("replaces the previous order for the same (slug, table) — a table turning over", () => {
    const stale = makeOrder({ id: "order-old", at: now - 1000 });
    const fresh = makeOrder({ id: "order-new", at: now });
    const result = mergeTrackedOrder([stale], fresh);
    expect(result).toEqual([fresh]);
  });

  it("leaves orders from a different table untouched", () => {
    const otherTable = makeOrder({ id: "order-t5", table: "5" });
    const result = mergeTrackedOrder([otherTable], makeOrder({ id: "order-t4" }));
    expect(result).toEqual([otherTable, makeOrder({ id: "order-t4" })]);
  });

  it("leaves orders from a different restaurant untouched, even on the same table number", () => {
    const otherRestaurant = makeOrder({ id: "order-other", slug: "pizza-rif" });
    const result = mergeTrackedOrder([otherRestaurant], makeOrder({ id: "order-here" }));
    expect(result).toEqual([otherRestaurant, makeOrder({ id: "order-here" })]);
  });

  it("distinguishes delivery orders (table: null) by slug alone", () => {
    const priorDelivery = makeOrder({ id: "order-old", table: null });
    const newDelivery = makeOrder({ id: "order-new", table: null });
    expect(mergeTrackedOrder([priorDelivery], newDelivery)).toEqual([newDelivery]);
  });
});

describe("parseStoredOrders", () => {
  it("reads back a well-formed payload", () => {
    const payload = JSON.stringify([makeOrder()]);
    expect(parseStoredOrders(payload)).toEqual([makeOrder()]);
  });

  it("treats a missing payload as no tracked orders", () => {
    expect(parseStoredOrders(null)).toEqual([]);
  });

  it("drops a payload that isn't an array rather than throwing", () => {
    expect(parseStoredOrders(JSON.stringify({ id: "not-an-array" }))).toEqual([]);
  });

  it("drops malformed JSON rather than throwing", () => {
    expect(parseStoredOrders("{not json")).toEqual([]);
  });

  // A hand-edited or partially-written localStorage value must not crash the
  // whole list — one bad entry is dropped, the rest still render.
  it("filters out entries missing required fields", () => {
    const good = makeOrder({ id: "order-good" });
    const payload = JSON.stringify([good, { id: "order-bad" }, null, "garbage"]);
    expect(parseStoredOrders(payload)).toEqual([good]);
  });
});
