"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { useTranslations } from "next-intl";
import { CategoryCarousel } from "@/components/site/category-carousel";
import type { Category, Item } from "@/lib/types";

// Generic, restaurant-agnostic placeholder — same fallback image used
// elsewhere on the site (welcome grid, about gallery) rather than curated
// per-item photography tied to one restaurant's menu.
const FALLBACK_DISH_IMAGE = "/images/hero-default.webp";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, filter: "blur(20px)", y: 40 },
  visible: { 
    opacity: 1, 
    filter: "blur(0px)", 
    y: 0, 
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
  },
};

export function SpecialsSection({
  categories,
  items,
  slug,
  currency,
  heading,
  sub,
  imageUrl,
}: {
  categories: Category[];
  items: Item[];
  slug: string;
  currency: string;
  heading?: string;
  sub?: string;
  imageUrl?: string | null;
}) {
  const t = useTranslations("Specials");

  if (!items || items.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-28">
      {/* Decorative Botanicals */}
      <div className="pointer-events-none absolute left-[2%] top-[5%] w-42 opacity-10 dark:invert dark:opacity-20 sm:w-80">
        <Image src="/images/Group (5).svg" alt="" width={119} height={124} className="h-auto w-full" />
      </div>
      <div className="pointer-events-none absolute right-[5%] top-[10%] w-48 opacity-10 dark:invert dark:opacity-20 sm:w-64">
        <Image src="/images/Group (1).svg" alt="" width={316} height={300} className="h-auto w-full" />
      </div>
      <div className="pointer-events-none absolute bottom-[5%] right-[2%] w-72 opacity-10 dark:invert dark:opacity-20 sm:w-96">
        <Image src="/images/Group (6).svg" alt="" width={77} height={78} className="h-auto w-full" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="relative mx-auto max-w-[1600px] px-4 xl:px-8"
      >
        {/* Header Text Blur-Fade-Up */}
        <div className="mx-auto mb-16 max-w-xl text-center flex flex-col items-center">
          <motion.h2 
            variants={itemVariants}
            className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl"
          >
            {heading ?? t("heading")}
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-4 text-sm text-muted-foreground md:text-base max-w-lg"
          >
            {sub ?? t("sub")}
          </motion.p>
        </div>

        {/* Main Section Card Container Blur-Fade-Up */}
        <motion.div 
          variants={itemVariants} 
          className="relative flex flex-col lg:flex-row overflow-hidden rounded-[40px] bg-[#0b1f2e] dark:bg-[#0c1824] shadow-2xl"
        >
          {/* Left Side: Featured Image */}
          <motion.div variants={itemVariants} className="relative z-20 w-full lg:w-[45%] lg:p-12">
            <div className="relative w-full h-full min-h-[340px] lg:min-h-[400px] overflow-hidden rounded-b-[40px] lg:rounded-[32px] shadow-xl">
              <Image
                src={imageUrl || FALLBACK_DISH_IMAGE}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover object-center hover:scale-105 transition-transform duration-500"
                alt={t("imageAlt")}
              />
            </div>
          </motion.div>

          {/* Right Side: Category carousel */}
          <motion.div variants={itemVariants} className="relative z-10 w-full lg:w-[55%] p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
            <CategoryCarousel
              categories={categories}
              items={items}
              slug={slug}
              currency={currency}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
