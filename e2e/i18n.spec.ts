import { test, expect } from "@playwright/test";
import { locales, LOCALE_COOKIE } from "../src/i18n/config";

// Language-switch smoke suite.
//
// The failure this guards against is not "the switcher is broken" — it's a
// single forgotten string. A page that is 95% translated looks fine in review
// and wrong to a visitor, so instead of asserting on individual labels this
// sweeps the rendered text of every public page and fails on any French
// marker while the site is in English mode.
//
// Same constraint as the other suites here: runs against a real server and a
// live Supabase project (see playwright.config.ts).

const STOREFRONT_SLUG = "orendezvous";

const PAGES = [
  { name: "home", path: `/${STOREFRONT_SLUG}` },
  { name: "menu", path: `/${STOREFRONT_SLUG}/menu` },
  { name: "about", path: `/${STOREFRONT_SLUG}/about` },
  { name: "contact", path: `/${STOREFRONT_SLUG}/contact` },
  { name: "reservation", path: `/${STOREFRONT_SLUG}/reservation` },
  { name: "events", path: `/${STOREFRONT_SLUG}/events` },
];

// Words that only ever appear in French chrome. Deliberately short and
// unambiguous: each is a whole word, and none is a plausible English word or a
// plausible dish name — restaurant content (dish names, event titles) is
// operator-entered and may legitimately stay French until translated, so the
// sweep must not trip over it.
const FRENCH_MARKERS = [
  "réserver",
  "réservation",
  "envoyer",
  "votre",
  "vous",
  "aucun",
  "aucune",
  "chargement",
  "disponible",
  "indisponible",
  "précédente",
  "suivante",
  "obligatoire",
  "requis",
  "gratuit",
  "épuisé",
  "panier",
  "commande",
  "horaires",
  "adresse",
];

async function setLocale(context: import("@playwright/test").BrowserContext, locale: string) {
  const { origin } = new URL(
    process.env.BASE_URL ?? "http://localhost:4000",
  );
  await context.addCookies([
    { name: LOCALE_COOKIE, value: locale, url: origin },
  ]);
}

test.describe("locale switching", () => {
  test("the config exposes exactly the locales the site ships", () => {
    expect([...locales].sort()).toEqual(["en", "fr"]);
  });

  for (const { name, path } of PAGES) {
    test(`${name} renders lang=en and no French chrome in English`, async ({
      page,
      context,
    }) => {
      await setLocale(context, "en");
      await page.goto(path);

      await expect(page.locator("html")).toHaveAttribute("lang", "en");

      const text = (await page.locator("body").innerText()).toLowerCase();
      const found = FRENCH_MARKERS.filter((word) =>
        new RegExp(`\\b${word}\\b`, "i").test(text),
      );
      expect(
        found,
        `French chrome still rendered in English mode on ${path}: ${found.join(", ")}`,
      ).toEqual([]);
    });

    test(`${name} renders lang=fr in French`, async ({ page, context }) => {
      await setLocale(context, "fr");
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    });
  }

  test("the switcher flips the page without a full reload path", async ({ page }) => {
    await page.goto(`/${STOREFRONT_SLUG}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");

    // The switcher is rendered twice (desktop bar + mobile drawer); click
    // whichever one is actually visible at this viewport.
    await page
      .getByRole("button", { name: /langue|language/i })
      .locator("visible=true")
      .first()
      .click();
    await page.getByRole("menuitem", { name: /english/i }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
