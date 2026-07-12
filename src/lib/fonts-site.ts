import {
  Barlow,
  Bebas_Neue,
  Cormorant_Garamond,
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
  Source_Sans_3,
  Work_Sans,
} from "next/font/google";

// Curated heading/body font pairs for the Site Builder, beyond the platform
// default (see @/lib/fonts). Only imported under [slug], so these never
// weigh down the root layout's compile. All use preload:false — next/font
// still emits @font-face rules for all of them, but the browser only
// fetches a family when text actually uses it.

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

// The [slug] layout mounts this on its wrapper div, then picks a pair by
// reassigning --font-display/--font-sans to one of these var() references
// (see FONT_PAIRS in @/lib/fonts).
export const siteFontClassNames = [
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
