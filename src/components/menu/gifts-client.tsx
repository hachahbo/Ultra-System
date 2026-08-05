"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, type Variants } from "framer-motion";
import { Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromoCodeForm } from "@/components/menu/promo-code-form";
import { useCart, useCartHydrated } from "@/store/cart";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const blurFadeUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

// Standalone code-redemption page — reachable from the nav ("Gifts") for a
// visitor who got a code from marketing/a friend before they've even started
// an order. Applying here writes to the same cart.promo the checkout page's
// PromoCodeForm reads, so whichever one they used, it carries over.
export function GiftsClient({ slug, currency }: { slug: string; currency: string }) {
  const t = useTranslations("Gifts");
  const hydrated = useCartHydrated();
  const { lines } = useCart();

  if (!hydrated) return null;

  const hasItems = lines.length > 0;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="mx-auto max-w-md px-4 py-14 text-center"
    >
      <motion.div
        variants={blurFadeUp}
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Gift className="size-7" />
      </motion.div>
      <motion.h1
        variants={blurFadeUp}
        className="mt-5 font-display text-3xl font-semibold tracking-tight"
      >
        {t("heading")}
      </motion.h1>
      <motion.p variants={blurFadeUp} className="mt-2 text-muted-foreground">
        {t("subtitle")}
      </motion.p>

      <motion.div variants={blurFadeUp} className="mt-8">
        <PromoCodeForm slug={slug} currency={currency} />
      </motion.div>

      <motion.div variants={blurFadeUp} className="mt-8">
        <Button asChild className="w-full rounded-full h-12 font-bold gap-2">
          <Link href={`/${slug}/${hasItems ? "checkout" : "menu"}`}>
            {hasItems ? t("goToCheckout") : t("seeMenu")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
