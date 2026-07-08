import {
  Barlow,
  Bebas_Neue,
  Cormorant_Garamond,
  DM_Serif_Display,
  Fraunces,
  Inter,
  Josefin_Sans,
  Karla,
  Lato,
  Libre_Baskerville,
  Lora,
  Marcellus,
  Nunito_Sans,
  Open_Sans,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Source_Sans_3,
  Work_Sans,
} from "next/font/google";
import type { FontPairKey } from "@/lib/types";

// Curated heading/body font pairs for the Site Builder. `darna-classic` is the
// platform default (current live look) and is the only pair preloaded — every
// other pair uses preload:false so an unthemed restaurant costs zero extra
// font bytes (next/font still emits @font-face rules for all of them, but the
// browser only fetches a family when text actually uses it).

const darnaClassicDisplay = DM_Serif_Display({
  weight: "400",
  variable: "--f-darna-classic-display",
  subsets: ["latin"],
});
const darnaClassicSans = Plus_Jakarta_Sans({
  variable: "--f-darna-classic-sans",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({ variable: "--f-playfair", subsets: ["latin"], preload: false });
const interFont = Inter({ variable: "--f-inter", subsets: ["latin"], preload: false });

const fraunces = Fraunces({ variable: "--f-fraunces", subsets: ["latin"], preload: false });
const workSans = Work_Sans({ variable: "--f-work-sans", subsets: ["latin"], preload: false });

const cormorant = Cormorant_Garamond({
  weight: ["400", "600"],
  variable: "--f-cormorant",
  subsets: ["latin"],
  preload: false,
});
const karla = Karla({ variable: "--f-karla", subsets: ["latin"], preload: false });

const libreBaskerville = Libre_Baskerville({
  weight: "400",
  variable: "--f-libre-baskerville",
  subsets: ["latin"],
  preload: false,
});
const sourceSans3 = Source_Sans_3({ variable: "--f-source-sans-3", subsets: ["latin"], preload: false });

const marcellus = Marcellus({ weight: "400", variable: "--f-marcellus", subsets: ["latin"], preload: false });
const nunitoSans = Nunito_Sans({ variable: "--f-nunito-sans", subsets: ["latin"], preload: false });

const lora = Lora({ variable: "--f-lora", subsets: ["latin"], preload: false });
const openSans = Open_Sans({ variable: "--f-open-sans", subsets: ["latin"], preload: false });

const bebasNeue = Bebas_Neue({ weight: "400", variable: "--f-bebas-neue", subsets: ["latin"], preload: false });
const barlow = Barlow({ weight: "400", variable: "--f-barlow", subsets: ["latin"], preload: false });

const josefinSans = Josefin_Sans({ variable: "--f-josefin-sans", subsets: ["latin"], preload: false });
const latoFont = Lato({ weight: "400", variable: "--f-lato", subsets: ["latin"], preload: false });

// Every .variable class needs to be on <html> for the CSS vars to exist
// globally; the [slug] layout then picks a pair by reassigning
// --font-display/--font-sans to one of these var() references.
export const fontVariableClassNames = [
  darnaClassicDisplay.variable,
  darnaClassicSans.variable,
  playfairDisplay.variable,
  interFont.variable,
  fraunces.variable,
  workSans.variable,
  cormorant.variable,
  karla.variable,
  libreBaskerville.variable,
  sourceSans3.variable,
  marcellus.variable,
  nunitoSans.variable,
  lora.variable,
  openSans.variable,
  bebasNeue.variable,
  barlow.variable,
  josefinSans.variable,
  latoFont.variable,
].join(" ");

export const FONT_PAIRS: Record<
  FontPairKey,
  { label: string; displayVar: string; sansVar: string }
> = {
  "darna-classic": {
    label: "Darna Classic (DM Serif + Plus Jakarta)",
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
