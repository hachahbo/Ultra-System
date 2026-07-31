import { describe, expect, it } from "vitest";
import {
  localizeCategory,
  localizeEvent,
  localizeItem,
  localizeTheme,
} from "@/lib/i18n-content";
import type { Category, Item, ResolvedTheme, RestaurantEvent } from "@/lib/types";

const category: Category = {
  id: "c1",
  restaurant_id: "r1",
  name_fr: "Entrées",
  name_ar: null,
  name_es: null,
  sort_order: 0,
  i18n: { en: { name: "Starters" } },
};

const item: Item = {
  id: "i1",
  restaurant_id: "r1",
  category_id: "c1",
  name_fr: "Salade grecque",
  name_ar: null,
  name_es: null,
  description_fr: "Fraîche et de saison",
  base_price: 60,
  image_url: null,
  in_stock: true,
  sort_order: 0,
  is_smart_menu_eligible: false,
  customization_groups: [],
  i18n: { en: { name: "Greek salad" } },
};

const event: RestaurantEvent = {
  id: "e1",
  restaurant_id: "r1",
  slug: "jazz",
  title: "Soirée Jazz",
  tagline: "Ambiance feutrée",
  description: "Un trio live",
  category: "live_music",
  status: "upcoming",
  cover_image: null,
  badge_label: "Ce vendredi",
  start_date: "2026-08-01T20:00:00Z",
  end_date: null,
  doors_open: null,
  is_free_entry: true,
  ticket_price: 0,
  currency: "MAD",
  minimum_spend_per_person: 0,
  max_seats: null,
  reserved_seats: 0,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  i18n: { en: { title: "Jazz Night", badge_label: "" } },
};

const theme: ResolvedTheme = {
  restaurant_id: "r1",
  color_primary: null,
  color_secondary: null,
  color_background: null,
  color_text: null,
  font_pair: "darna-classic",
  logo_url: null,
  hero_image_urls: [],
  about_title: "Notre maison",
  about_body: "Un lieu chaleureux",
  address: "Rue X",
  sections: [],
  custom_copy: { hero_headline: "Bienvenue", hero_sub: "Sous-titre" },
  welcome_gallery_urls: [],
  values_items: [
    { image_url: "/a.jpg", title: "Accueil", body: "Comme à la maison" },
    { image_url: "/b.jpg", title: "Partage", body: "Se retrouver" },
  ],
  testimonials: [{ text: "Superbe", author: "Ana" }],
  about_gallery_urls: [],
  about_rating: null,
  about_review_count: null,
  about_map_url: null,
  specials_image_url: null,
  social_facebook_url: null,
  social_instagram_url: null,
  social_twitter_url: null,
  i18n: {
    en: {
      about_title: "Our house",
      custom_copy: { hero_headline: "Welcome" },
      values_items: [{ title: "Welcome" }],
      testimonials: [{ text: "Wonderful" }],
    },
  },
  updated_at: "2026-07-01T00:00:00Z",
};

describe("localize* — French is the base row", () => {
  it("returns rows untouched for the default locale", () => {
    expect(localizeCategory(category, "fr").name_fr).toBe("Entrées");
    expect(localizeItem(item, "fr").name_fr).toBe("Salade grecque");
    expect(localizeEvent(event, "fr").title).toBe("Soirée Jazz");
    expect(localizeTheme(theme, "fr").about_title).toBe("Notre maison");
  });

  it("falls back to French for an unknown locale", () => {
    expect(localizeItem(item, "de").name_fr).toBe("Salade grecque");
  });
});

describe("localize* — English overrides", () => {
  it("applies the override when present", () => {
    expect(localizeCategory(category, "en").name_fr).toBe("Starters");
    expect(localizeItem(item, "en").name_fr).toBe("Greek salad");
    expect(localizeEvent(event, "en").title).toBe("Jazz Night");
  });

  it("keeps French per field when only part of a row is translated", () => {
    // The item has an English name but no English description.
    expect(localizeItem(item, "en").description_fr).toBe("Fraîche et de saison");
    // The event's badge is an empty string, which must not blank the badge.
    expect(localizeEvent(event, "en").badge_label).toBe("Ce vendredi");
    expect(localizeEvent(event, "en").tagline).toBe("Ambiance feutrée");
  });

  it("merges custom_copy key by key rather than replacing the object", () => {
    const localized = localizeTheme(theme, "en");
    expect(localized.custom_copy.hero_headline).toBe("Welcome");
    expect(localized.custom_copy.hero_sub).toBe("Sous-titre");
  });

  it("keeps values/testimonials index-aligned and preserves images", () => {
    const localized = localizeTheme(theme, "en");
    expect(localized.values_items[0].title).toBe("Welcome");
    // Untranslated body and the shared image both survive.
    expect(localized.values_items[0].body).toBe("Comme à la maison");
    expect(localized.values_items[0].image_url).toBe("/a.jpg");
    // Card 2 has no translation entry at all.
    expect(localized.values_items[1].title).toBe("Partage");
    expect(localized.testimonials[0].text).toBe("Wonderful");
    expect(localized.testimonials[0].author).toBe("Ana");
  });

  it("does not mutate the source row", () => {
    localizeTheme(theme, "en");
    expect(theme.custom_copy.hero_headline).toBe("Bienvenue");
    expect(theme.values_items[0].title).toBe("Accueil");
  });
});

describe("localize* — the i18n bag never reaches the client", () => {
  it("strips the bag in both locales", () => {
    for (const locale of ["fr", "en"]) {
      expect(localizeCategory(category, locale).i18n).toBeUndefined();
      expect(localizeItem(item, locale).i18n).toBeUndefined();
      expect(localizeEvent(event, locale).i18n).toBeUndefined();
      expect(localizeTheme(theme, locale).i18n).toEqual({});
    }
  });
});
