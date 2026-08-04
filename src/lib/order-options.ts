import type { CustomizationGroup } from "@/lib/types";

// A CustomizationGroup titled "Ingrédients" is the composition section: its
// options are things the customer can *remove*, never add. Mirrors
// INGREDIENTS_GROUP_KEY in src/components/menu/item-dialog.tsx.
const INGREDIENTS_GROUP_KEY = "Ingrédients";

// item-dialog.tsx encodes two synthetic option strings that have no matching
// row in customization_groups: a removed ingredient and a free-text kitchen
// note. Both are written in canonical French regardless of the visitor's
// locale (see the comment at item-dialog.tsx:185), so matching on these
// prefixes is stable across languages.
const WITHOUT_PREFIX = "Sans ";
const NOTE_PREFIX = "Note: ";

export type LineOptionsResult =
  | { ok: true; options: string[]; priceModifier: number }
  | { ok: false; invalid: string };

/**
 * Validates the option strings on one order line against the item's real
 * customization groups, and returns the total price modifier they imply.
 *
 * Order matters: a real option always wins over the synthetic prefixes, so an
 * option genuinely named "Sans gluten" keeps its own price_modifier instead of
 * being read as a removed ingredient. Synthetic entries never move the price —
 * removing an ingredient is free, and a note is just text for the kitchen.
 *
 * Anything that matches nothing is rejected rather than silently dropped: it
 * means the client and the menu have diverged, and quietly discarding it would
 * send the kitchen a ticket missing what the customer actually asked for.
 */
export function resolveLineOptions(
  groups: CustomizationGroup[],
  requested: string[],
): LineOptionsResult {
  const allOptions = groups.flatMap((g) => g.options ?? []);
  const removable = new Set(
    groups
      .filter((g) => g.title?.fr === INGREDIENTS_GROUP_KEY)
      .flatMap((g) => (g.options ?? []).map((o) => o.name)),
  );

  const options: string[] = [];
  let priceModifier = 0;

  for (const raw of requested) {
    const match = allOptions.find((o) => o.name === raw);
    if (match) {
      priceModifier += Number(match.price_modifier);
      options.push(raw);
      continue;
    }

    if (raw.startsWith(NOTE_PREFIX) && raw.slice(NOTE_PREFIX.length).trim()) {
      options.push(raw);
      continue;
    }

    if (
      raw.startsWith(WITHOUT_PREFIX) &&
      removable.has(raw.slice(WITHOUT_PREFIX.length))
    ) {
      options.push(raw);
      continue;
    }

    return { ok: false, invalid: raw };
  }

  return { ok: true, options, priceModifier };
}
