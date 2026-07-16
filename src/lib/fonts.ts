import { Roboto, Plus_Jakarta_Sans } from "next/font/google";
import type { FontPairKey } from "@/lib/types";

// This file is imported by the ROOT layout (every route, incl. /dashboard
// and /login), so it only loads the platform default pair. The other 16
// pairs live in @/lib/fonts-site and are loaded only where they're actually
// used, under [slug] — keeping them out of this module graph so the root
// layout's cold compile stays cheap.

const darnaClassicDisplay = Roboto({
  weight: ["400", "500", "700", "900"],
  variable: "--f-darna-classic-display",
  subsets: ["latin"],
});
const darnaClassicSans = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  variable: "--f-darna-classic-sans",
  subsets: ["latin"],
});

export const rootFontClassNames = [
  darnaClassicDisplay.variable,
  darnaClassicSans.variable,
].join(" ");

export const FONT_PAIRS: Record<
  FontPairKey,
  { label: string; displayVar: string; sansVar: string }
> = {
  "darna-classic": {
    label: "Darna Classic (Roboto)",
    displayVar: "var(--f-darna-classic-display)",
    sansVar: "var(--f-darna-classic-sans)",
  },
  "playfair-inter": {
    label: "Playfair Display + Inter",
    displayVar: "var(--f-playfair)",
    sansVar: "var(--f-inter)",
  },
  "fraunces-work-sans": {
    label: "Fraunces + Work Sans",
    displayVar: "var(--f-fraunces)",
    sansVar: "var(--f-work-sans)",
  },
  "cormorant-karla": {
    label: "Cormorant Garamond + Karla",
    displayVar: "var(--f-cormorant)",
    sansVar: "var(--f-karla)",
  },
  "libre-source": {
    label: "Libre Baskerville + Source Sans 3",
    displayVar: "var(--f-libre-baskerville)",
    sansVar: "var(--f-source-sans-3)",
  },
  "marcellus-nunito": {
    label: "Marcellus + Nunito Sans",
    displayVar: "var(--f-marcellus)",
    sansVar: "var(--f-nunito-sans)",
  },
  "lora-open-sans": {
    label: "Lora + Open Sans",
    displayVar: "var(--f-lora)",
    sansVar: "var(--f-open-sans)",
  },
  "bebas-barlow": {
    label: "Bebas Neue + Barlow",
    displayVar: "var(--f-bebas-neue)",
    sansVar: "var(--f-barlow)",
  },
  "josefin-lato": {
    label: "Josefin Sans + Lato",
    displayVar: "var(--f-josefin-sans)",
    sansVar: "var(--f-lato)",
  },
};
