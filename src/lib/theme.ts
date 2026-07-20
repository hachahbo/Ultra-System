// Pure theme helpers — importable from server and client code alike (no
// "server-only", no Supabase). Resolves defaults, merges a draft over the
// live row, and builds the CSS-variable override block injected by
// src/app/[slug]/layout.tsx (see plan D2/D3).

import { FONT_PAIRS } from "@/lib/fonts";
import type { FontPairKey, RestaurantTheme, ResolvedTheme, ThemeSection } from "@/lib/types";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_SECTIONS: ThemeSection[] = [
  { key: "hero", enabled: true },
  { key: "specials", enabled: true },
  { key: "welcome", enabled: true },
  // Enabled by default but harmless while values_items/testimonials are
  // empty — the renderers (ValuesSection/TestimonialsSection) skip an
  // enabled-but-empty section, so a restaurant with no content set yet
  // simply shows nothing, not a toggle an operator has to remember to flip.
  { key: "values", enabled: true },
  { key: "testimonials", enabled: true },
];

const DEFAULT_THEME: Omit<ResolvedTheme, "restaurant_id"> = {
  color_primary: null,
  color_secondary: null,
  color_background: null,
  color_text: null,
  font_pair: "darna-classic",
  logo_url: null,
  hero_image_urls: [],
  about_title: null,
  about_body: null,
  address: null,
  sections: DEFAULT_SECTIONS,
  custom_copy: {},
  welcome_gallery_urls: [],
  values_items: [],
  testimonials: [],
  about_gallery_urls: [],
  about_rating: null,
  about_review_count: null,
  about_map_url: null,
  specials_image_url: null,
  social_facebook_url: null,
  social_instagram_url: null,
  social_twitter_url: null,
  updated_at: new Date(0).toISOString(),
};

/** Applies defaults for a restaurant that has no theme row yet (defensive —
 * every restaurant gets one at creation time, see api/admin/restaurants). */
export function resolveTheme(
  row: Omit<RestaurantTheme, "draft"> | null,
  restaurantId: string,
): ResolvedTheme {
  if (!row) return { restaurant_id: restaurantId, ...DEFAULT_THEME };
  return row;
}

/** Merges a draft (if any) over the live row — used only by the
 * admin-authenticated preview path (src/lib/site-theme.ts). Never call this
 * with data reachable by anonymous requests. */
export function mergeDraft(row: RestaurantTheme): ResolvedTheme {
  const { draft, ...live } = row;
  if (!draft) return live;
  return { ...live, ...draft };
}

/** White or near-black foreground, chosen by relative luminance, so a
 * primary/secondary color picked in the builder always keeps its
 * "-foreground" pairing readable. */
export function contrastForeground(hex: string): string {
  if (!HEX_RE.test(hex)) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return luminance > 0.55 ? "#111111" : "#ffffff";
}

function safeHex(hex: string | null): string | null {
  return hex && HEX_RE.test(hex) ? hex : null;
}

/**
 * Builds the <style> block a [slug] page injects to override brand CSS
 * variables for one restaurant. Scoped to `[data-site-theme]` (not `:root`)
 * so it never leaks outside the public site wrapper, and to
 * `.dark [data-site-theme]` for dark mode so the platform's dark background/
 * foreground stay intact — only brand accents (primary/secondary/ring) carry
 * over in dark mode, keeping contrast guaranteed.
 *
 * Every value is regex-validated here (in addition to the zod schema + DB
 * check constraint) before interpolation — defense in depth against CSS
 * injection since this string is rendered via dangerouslySetInnerHTML.
 */
export function buildThemeCss(theme: ResolvedTheme): string {
  const primary = safeHex(theme.color_primary);
  const secondary = safeHex(theme.color_secondary);
  const background = safeHex(theme.color_background);
  const text = safeHex(theme.color_text);

  const lightVars: string[] = [];
  const darkVars: string[] = [];

  if (background) lightVars.push(`--background: ${background};`);
  if (text) lightVars.push(`--foreground: ${text};`, `--card-foreground: ${text};`);
  if (primary) {
    const onPrimary = contrastForeground(primary);
    lightVars.push(`--primary: ${primary};`, `--primary-foreground: ${onPrimary};`, `--ring: ${primary};`);
    darkVars.push(`--primary: ${primary};`, `--primary-foreground: ${onPrimary};`, `--ring: ${primary};`);
  }
  if (secondary) {
    const onSecondary = contrastForeground(secondary);
    lightVars.push(`--secondary: ${secondary};`, `--secondary-foreground: ${onSecondary};`);
    darkVars.push(`--secondary: ${secondary};`, `--secondary-foreground: ${onSecondary};`);
  }

  const pair = FONT_PAIRS[theme.font_pair as FontPairKey] ?? FONT_PAIRS["darna-classic"];
  if (theme.font_pair !== "darna-classic") {
    lightVars.push(`--font-display: ${pair.displayVar};`, `--font-sans: ${pair.sansVar};`);
  }

  if (lightVars.length === 0 && darkVars.length === 0) return "";

  const rules: string[] = [];
  if (lightVars.length > 0) rules.push(`[data-site-theme] { ${lightVars.join(" ")} }`);
  if (darkVars.length > 0) rules.push(`.dark [data-site-theme] { ${darkVars.join(" ")} }`);
  return rules.join("\n");
}

/** True when the builder should show a low-contrast warning. */
export function hasLowContrast(background: string | null, text: string | null): boolean {
  if (!background || !text || !HEX_RE.test(background) || !HEX_RE.test(text)) return false;
  const luminanceOf = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };
  const l1 = luminanceOf(background);
  const l2 = luminanceOf(text);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return ratio < 4.5;
}
