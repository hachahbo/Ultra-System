import { describe, expect, it } from "vitest";
import { resolveLineOptions } from "@/lib/order-options";
import type { CustomizationGroup } from "@/lib/types";

const groups: CustomizationGroup[] = [
  {
    title: { fr: "Cuisson" },
    required: true,
    max_selections: 1,
    options: [
      { name: "Saignant", price_modifier: 0 },
      { name: "Bien cuit", price_modifier: 0 },
    ],
  },
  {
    title: { fr: "Suppléments" },
    required: false,
    max_selections: 3,
    options: [
      { name: "Fromage", price_modifier: 10 },
      { name: "Bacon", price_modifier: 15 },
    ],
  },
  {
    title: { fr: "Ingrédients" },
    required: false,
    max_selections: 10,
    options: [
      { name: "Oignons", price_modifier: 0 },
      { name: "Cornichons", price_modifier: 0 },
    ],
  },
];

describe("resolveLineOptions", () => {
  it("sums the price modifiers of real options", () => {
    const r = resolveLineOptions(groups, ["Fromage", "Bacon"]);
    expect(r.ok && r.priceModifier).toBe(25);
    expect(r.ok && r.options).toEqual(["Fromage", "Bacon"]);
  });

  // The regression: item-dialog.tsx emits these two synthetic strings, and
  // both order routes used to reject them outright with "Option invalide".
  it("accepts a removed ingredient, free of charge", () => {
    const r = resolveLineOptions(groups, ["Sans Oignons"]);
    expect(r.ok).toBe(true);
    expect(r.ok && r.priceModifier).toBe(0);
    expect(r.ok && r.options).toEqual(["Sans Oignons"]);
  });

  it("accepts a kitchen note, free of charge", () => {
    const r = resolveLineOptions(groups, ["Note: sans sel svp"]);
    expect(r.ok).toBe(true);
    expect(r.ok && r.priceModifier).toBe(0);
  });

  it("handles a realistic mixed line", () => {
    const r = resolveLineOptions(groups, [
      "Bien cuit",
      "Fromage",
      "Sans Cornichons",
      "Note: pour emporter",
    ]);
    expect(r.ok && r.priceModifier).toBe(10);
    expect(r.ok && r.options).toHaveLength(4);
  });

  // Price integrity: a real option must never be reinterpreted as a free
  // synthetic one just because of how it happens to be named.
  it("prefers a real option over the 'Sans ' prefix rule", () => {
    const withPricedSans: CustomizationGroup[] = [
      {
        title: { fr: "Régime" },
        required: false,
        max_selections: 1,
        options: [{ name: "Sans gluten", price_modifier: 12 }],
      },
    ];
    const r = resolveLineOptions(withPricedSans, ["Sans gluten"]);
    expect(r.ok && r.priceModifier).toBe(12);
  });

  it("rejects a removal of an ingredient the item doesn't have", () => {
    const r = resolveLineOptions(groups, ["Sans Truffe"]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.invalid).toBe("Sans Truffe");
  });

  it("rejects an invented option", () => {
    const r = resolveLineOptions(groups, ["Caviar gratuit"]);
    expect(r.ok).toBe(false);
  });

  it("rejects an empty note rather than passing a bare prefix through", () => {
    expect(resolveLineOptions(groups, ["Note:   "]).ok).toBe(false);
  });

  it("does not treat a non-ingredient group as removable", () => {
    // "Fromage" is a paid supplement, not part of the composition section.
    expect(resolveLineOptions(groups, ["Sans Fromage"]).ok).toBe(false);
  });

  it("returns an empty result for a line with no options", () => {
    const r = resolveLineOptions(groups, []);
    expect(r.ok && r.priceModifier).toBe(0);
    expect(r.ok && r.options).toEqual([]);
  });

  it("survives an item with no customization groups", () => {
    expect(resolveLineOptions([], ["Fromage"]).ok).toBe(false);
    expect(resolveLineOptions([], []).ok).toBe(true);
  });
});
