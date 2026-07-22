"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);

  const displayedItems = isExpanded ? items : items.slice(0, 1);

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

        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row overflow-hidden rounded-[40px] bg-[#0b1f2e] dark:bg-[#0c1824] shadow-2xl">
          {/* Left Side: Featured Image */}
          <div className="w-full lg:w-[45%] lg:p-12">
            <div className="relative w-full h-full min-h-[340px] lg:min-h-[400px] overflow-hidden rounded-b-[40px] lg:rounded-[32px] shadow-xl">
              <Image
                src={imageUrl || FALLBACK_DISH_IMAGE}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover object-center hover:scale-105 transition-transform duration-500"
                alt="Nos plats"
              />
            </div>
          </div>

          {/* Right Side: Dishes list with Framer Motion expand */}
          <div className="w-full lg:w-[55%] p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
            <motion.div layout className="grid grid-cols-1 gap-x-12 gap-y-4 xl:gap-x-12 xl:gap-y-10 sm:grid-cols-2 mt-4">
              <AnimatePresence initial={false}>
                {displayedItems.map((item, index) => {
                  const itemWithImage = {
                    ...item,
                    image_url: item.image_url || FALLBACK_DISH_IMAGE,
                  };
                  return (
                    <motion.div 
                      key={item.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.92, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -15 }}
                      transition={{ 
                        duration: 0.45, 
                        ease: [0.16, 1, 0.3, 1],
                        delay: isExpanded && index > 0 ? (index - 1) * 0.08 : 0
                      }}
                    >
                      <DishCard item={itemWithImage} slug={slug} currency={currency} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {/* Expand / Collapse Action Button */}
            {items.length > 1 && (
              <motion.div 
                layout 
                className="mt-8 flex justify-center lg:justify-start"
              >
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  aria-expanded={isExpanded}
                  className="group relative inline-flex items-center gap-3 rounded-full bg-[#FF6B35]/20 text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white px-8 py-3.5 text-sm font-bold tracking-wide backdrop-blur-md border border-[#FF6B35]/40 shadow-[0_8px_20px_rgba(255,107,53,0.2)] hover:shadow-[0_12px_28px_rgba(255,107,53,0.4)] transition-all duration-300 active:scale-95 cursor-pointer outline-none select-none"
                >
                  <span>
                    {isExpanded
                      ? "Voir moins"
                      : `Voir toutes les spécialités (${items.length})`}
                  </span>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="inline-flex items-center justify-center"
                  >
                    <ChevronDown className="h-4 w-4 stroke-[3]" />
                  </motion.span>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
