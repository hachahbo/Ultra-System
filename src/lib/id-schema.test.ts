import { describe, expect, it } from "vitest";
import { z } from "zod";
import { idSchema, itemSchema, inventoryItemSchema } from "@/lib/schemas";

// Regression guard for the bug that made every menu/inventory form reject a
// perfectly valid foreign key with "Catégorie requise". Zod v4's `.uuid()`
// enforces the RFC 9562 version/variant nibbles; Postgres `uuid` does not.
// The seeded ids in this project fail the former and pass the latter.
const SEEDED_CATEGORY = "51111111-1111-1111-1111-111111111111";
const SEEDED_INVENTORY_CATEGORY = "71111111-1111-1111-1111-111111111111";
const SEEDED_RESTAURANT = "11111111-1111-1111-1111-111111111111";
const GENERATED = "d4df5905-0284-43ce-a580-1e024e0410d6";

describe("idSchema", () => {
  it("accepts the hand-written seed ids that `.uuid()` rejects", () => {
    for (const id of [SEEDED_CATEGORY, SEEDED_INVENTORY_CATEGORY, SEEDED_RESTAURANT]) {
      expect(z.string().uuid().safeParse(id).success).toBe(false); // the trap
      expect(idSchema().safeParse(id).success).toBe(true); // the fix
    }
  });

  it("still accepts normally generated uuids", () => {
    expect(idSchema().safeParse(GENERATED).success).toBe(true);
  });

  it("still rejects non-uuid junk", () => {
    for (const bad of ["", "not-an-id", "51111111-1111-1111-1111", "  "]) {
      expect(idSchema().safeParse(bad).success).toBe(false);
    }
  });
});

describe("forms accept seeded foreign keys", () => {
  it("itemSchema validates a menu item in a seeded category", () => {
    const r = itemSchema.safeParse({
      category_id: SEEDED_CATEGORY,
      name_fr: "Tajine",
      base_price: 80,
      in_stock: true,
      customization_groups: [],
      i18n: { en: { name: "", description: "" } },
      image_url: null,
    });
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });

  it("inventoryItemSchema validates an item in a seeded category", () => {
    const r = inventoryItemSchema.safeParse({
      category_id: SEEDED_INVENTORY_CATEGORY,
      name: "Farine",
      unit: "kg",
      stock: 10,
      min_threshold: 2,
    });
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });
});
