"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { DishCard } from "@/components/site/dish-card";
import type { Item } from "@/lib/types";

// Generic, restaurant-agnostic placeholder — same fallback image used
// elsewhere on the site (welcome grid, about gallery) rather than curated
// per-item photography tied to one restaurant's menu.
const FALLBACK_DISH_IMAGE = "/images/hero-default.webp";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function SpecialsSection({
  items,
  slug,
  currency,
  heading,
  sub,
  imageUrl,
}: {
  items: Item[];
  slug: string;
  currency: string;
  heading?: string;
  sub?: string;
  imageUrl?: string | null;
}) {
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
        <motion.div variants={itemVariants} className="mx-auto mb-16 max-w-xl text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {heading ?? "Our Special Dishes"}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            {sub ??
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore."}
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row overflow-hidden rounded-[40px] bg-[#0b1f2e] shadow-2xl">
          {/* Left Side: Featured Image */}
          <div className="w-full lg:w-[45%] lg:p-12">
            <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-b-[40px] lg:rounded-[32px] shadow-xl lg:shadow-xl">
              <Image
                src={imageUrl || FALLBACK_DISH_IMAGE}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover object-center hover:scale-105 transition-transform duration-500"
                alt="Nos plats"
              />
            </div>
          </div>

          {/* Right Side: 2x2 Grid of Dishes */}
          <div className="w-full lg:w-[55%] p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
            <div className="grid grid-cols-1 gap-x-12 gap-y-4 xl:gap-x-12 xl:gap-y-14 sm:grid-cols-2 mt-8">
              {items.map((item) => {
                const itemWithImage = {
                  ...item,
                  image_url: item.image_url || FALLBACK_DISH_IMAGE,
                };
                return (
                  <motion.div 
                    key={item.id} 
                    variants={itemVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-20px" }}
                  >
                    <DishCard item={itemWithImage} slug={slug} currency={currency} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
