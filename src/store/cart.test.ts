import { describe, expect, it } from "vitest";
import { isTableFresh, TABLE_TTL_MS } from "@/store/cart";

// The QR table number lives in localStorage, so it outlives the visit that
// set it. These pin the expiry rule that stops a table scanned at lunch from
// still being attached to an order placed from home days later.
describe("isTableFresh", () => {
  const now = 1_700_000_000_000;

  it("trusts a table scanned just now", () => {
    expect(isTableFresh(now, now)).toBe(true);
  });

  it("trusts a table scanned mid-meal", () => {
    expect(isTableFresh(now - 90 * 60 * 1000, now)).toBe(true);
  });

  it("drops a table once the TTL has elapsed", () => {
    expect(isTableFresh(now - TABLE_TTL_MS, now)).toBe(false);
    expect(isTableFresh(now - TABLE_TTL_MS - 1, now)).toBe(false);
  });

  it("drops a table scanned days ago", () => {
    expect(isTableFresh(now - 3 * 24 * 60 * 60 * 1000, now)).toBe(false);
  });

  // Carts persisted before the timestamp existed, and any hand-edited
  // localStorage payload, must read as stale rather than as fresh.
  it("treats a missing or non-numeric timestamp as stale", () => {
    for (const bad of [undefined, null, "", "1700000000000", NaN, {}]) {
      expect(isTableFresh(bad, now)).toBe(false);
    }
  });
});
