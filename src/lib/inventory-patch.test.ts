import { describe, expect, it } from "vitest";
import { z } from "zod";
import { inventoryItemSchema, stockAdjustSchema } from "@/lib/schemas";

// Mirrors the union in src/app/api/dashboard/inventory/[id]/route.ts. The
// branch order is load-bearing: inventoryItemSchema.partial() matches *any*
// object (no required keys, unknown keys stripped), so if it comes first a
// `{ delta }` body parses to `{}` and the stock steppers 400.
const patchSchema = z.union([stockAdjustSchema, inventoryItemSchema.partial()]);

describe("inventory PATCH body", () => {
  it("routes a stock delta to the adjust branch", () => {
    for (const delta of [-1, 1, -10, 250]) {
      const r = patchSchema.safeParse({ delta });
      expect(r.success).toBe(true);
      expect(r.success && "delta" in r.data && r.data.delta).toBe(delta);
    }
  });

  // A no-op delta fails the adjust branch's refine, then falls through to the
  // partial, which strips `delta` and yields {}. The route's empty-patch check
  // turns that into a 400 — so it never reaches the stock update either way.
  it("never applies a no-op delta", () => {
    const r = patchSchema.safeParse({ delta: 0 });
    expect(r.success && "delta" in r.data).toBe(false);
    expect(r.success && Object.keys(r.data).length).toBe(0);
  });

  it("routes a field edit to the partial branch, untouched", () => {
    const r = patchSchema.safeParse({ name: "Farine T55", unit: "kg", stock: 12 });
    expect(r.success).toBe(true);
    expect(r.success && r.data).toEqual({ name: "Farine T55", unit: "kg", stock: 12 });
  });

  it("leaves a genuinely empty body empty, so the route can 400 it", () => {
    const r = patchSchema.safeParse({});
    expect(r.success && Object.keys(r.data).length).toBe(0);
  });
});
