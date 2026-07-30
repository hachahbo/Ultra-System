import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { locales } from "@/i18n/config";

// A key present in one catalogue but not the other is the single most common
// i18n regression: next-intl falls back to printing the key itself, so the
// page renders "Menu.viewCart" to a visitor. Cheaper to catch here than in
// review.

type Messages = Record<string, unknown>;

function flatten(obj: Messages, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object" && !Array.isArray(value)
      ? flatten(value as Messages, path)
      : [path];
  });
}

/** ICU placeholders like {name} — the same set must exist in every locale. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
}

function valueAt(obj: Messages, path: string): string {
  return path.split(".").reduce<unknown>((acc, key) => (acc as Messages)?.[key], obj) as string;
}

describe("message catalogues", () => {
  const frKeys = flatten(fr as Messages);
  const enKeys = flatten(en as Messages);

  it("covers every configured locale", () => {
    expect([...locales].sort()).toEqual(["en", "fr"]);
  });

  it("has the same keys in French and English", () => {
    expect(enKeys.filter((k) => !frKeys.includes(k))).toEqual([]);
    expect(frKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it("has no empty strings", () => {
    const blank = frKeys.filter(
      (k) => !valueAt(fr as Messages, k)?.trim() || !valueAt(en as Messages, k)?.trim(),
    );
    expect(blank).toEqual([]);
  });

  it("uses the same ICU placeholders in both locales", () => {
    const mismatched = frKeys.filter((k) => {
      const a = placeholders(valueAt(fr as Messages, k));
      const b = placeholders(valueAt(en as Messages, k));
      return a.join(",") !== b.join(",");
    });
    expect(mismatched).toEqual([]);
  });
});
