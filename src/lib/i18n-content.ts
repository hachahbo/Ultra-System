import { isLocale, type Locale } from "@/i18n/config";
import type {
  Category,
  ContentLocale,
  I18nBag,
  Item,
  PublicMenu,
  ResolvedTheme,
  RestaurantEvent,
} from "@/lib/types";

// Resolves a row's translatable fields for the active locale (0023).
//
// French lives in the base columns and is the fallback for everything: a
// missing locale, a missing key, or an empty string all fall through to it.
// A half-translated dish therefore renders its English name next to its
// French description rather than a blank card.

/** French needs no lookup — it *is* the base row. */
function contentLocale(locale: string): ContentLocale | null {
  const normalized: Locale | null = isLocale(locale) ? locale : null;
  return normalized && normalized !== "fr" ? normalized : null;
}

/** The override value for `key`, or undefined when absent/blank. */
function pick<T, K extends keyof T>(
  bag: I18nBag<T> | null | undefined,
  locale: ContentLocale | null,
  key: K,
): T[K] | undefined {
  if (!locale || !bag) return undefined;
  const value = bag[locale]?.[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value as T[K];
}

export function localizeCategory(category: Category, locale: string): Category {
  const l = contentLocale(locale);
  if (!l) return category;
  return { ...category, name_fr: pick(category.i18n, l, "name") ?? category.name_fr };
}

export function localizeItem(item: Item, locale: string): Item {
  const l = contentLocale(locale);
  if (!l) return item;
  return {
    ...item,
    name_fr: pick(item.i18n, l, "name") ?? item.name_fr,
    description_fr: pick(item.i18n, l, "description") ?? item.description_fr,
  };
}

export function localizeMenu(menu: PublicMenu, locale: string): PublicMenu {
  const l = contentLocale(locale);
  if (!l) return menu;
  return {
    ...menu,
    categories: menu.categories.map((c) => localizeCategory(c, locale)),
    items: menu.items.map((i) => localizeItem(i, locale)),
  };
}

export function localizeEvent(event: RestaurantEvent, locale: string): RestaurantEvent {
  const l = contentLocale(locale);
  if (!l) return event;
  return {
    ...event,
    title: pick(event.i18n, l, "title") ?? event.title,
    tagline: pick(event.i18n, l, "tagline") ?? event.tagline,
    description: pick(event.i18n, l, "description") ?? event.description,
    badge_label: pick(event.i18n, l, "badge_label") ?? event.badge_label,
  };
}

export function localizeEvents(events: RestaurantEvent[], locale: string): RestaurantEvent[] {
  return events.map((e) => localizeEvent(e, locale));
}

export function localizeTheme(theme: ResolvedTheme, locale: string): ResolvedTheme {
  const l = contentLocale(locale);
  if (!l) return theme;

  const copyOverrides = pick(theme.i18n, l, "custom_copy") ?? {};
  // Only non-empty overrides win, so a partially filled English panel keeps
  // the French value for every field the operator hasn't translated yet.
  const custom_copy = { ...theme.custom_copy };
  for (const [key, value] of Object.entries(copyOverrides)) {
    if (typeof value === "string" && value.trim() !== "") {
      custom_copy[key as keyof typeof custom_copy] = value;
    }
  }

  const valueOverrides = pick(theme.i18n, l, "values_items") ?? [];
  const testimonialOverrides = pick(theme.i18n, l, "testimonials") ?? [];

  return {
    ...theme,
    about_title: pick(theme.i18n, l, "about_title") ?? theme.about_title,
    about_body: pick(theme.i18n, l, "about_body") ?? theme.about_body,
    custom_copy,
    // Index-aligned with the base arrays: entry n translates card n.
    values_items: theme.values_items.map((item, i) => ({
      ...item,
      title: valueOverrides[i]?.title?.trim() || item.title,
      body: valueOverrides[i]?.body?.trim() || item.body,
    })),
    testimonials: theme.testimonials.map((item, i) => ({
      ...item,
      text: testimonialOverrides[i]?.text?.trim() || item.text,
      author: testimonialOverrides[i]?.author?.trim() || item.author,
    })),
  };
}
