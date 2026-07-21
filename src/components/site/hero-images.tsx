"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function HeroImages({ images }: { images?: string[] }) {
  const main = images?.[0] ?? "/images/hero-default.webp";
  const pop = images?.[1] ?? "/images/hero-pop-default.webp";

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="absolute inset-0 z-0 flex w-full items-center justify-center lg:relative lg:mt-0 lg:w-1/2"
    >
      <div className="relative flex h-full min-h-[500px] w-full max-w-[400px] items-center justify-center lg:h-[600px]">
        {/* === Phase 2: Midground Layer (z-index: 10) Main Reveal === */}
        <motion.div
          variants={itemVariants}
          className="relative z-10 h-full w-[90%] overflow-hidden rounded-t-[100px] rounded-br-[60px] rounded-bl-[20px] shadow-2xl"
        >
          <Image
            src={main}
            alt="Restaurant interior"
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="object-cover"
          />
        </motion.div>

        {/* === Phase 3: Foreground Layer (z-index: 20) Pop === */}
        <motion.div
          variants={itemVariants}
          className="hidden lg:block absolute -left-12 bottom-[15%] z-20 w-[65%] sm:-left-20"
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-full shadow-2xl ring-4 ring-background">
            <Image
              src={pop}
              alt="Delicious food plate"
              fill
              sizes="35vw"
              className="scale-[1.25] object-cover object-center"
            />
          </div>
        </motion.div>

        {/* === Phase 1: Background Layer (z-index: 0) The SVGs === */}
        
        {/* Left Plant (Item 4) */}
        <motion.div
          variants={itemVariants}
          className="pointer-events-none absolute -left-16 top-10 z-0 w-64 opacity-60 dark:invert sm:-left-32 sm:top-20"
        >
          <Image src="/images/Group (3).svg" alt="" width={350} height={321} className="h-auto w-full object-contain" />
        </motion.div>

        {/* Right Plant Top (Item 3) */}
        <motion.div
          variants={itemVariants}
          className="pointer-events-none absolute -right-16 top-[5%] z-0 w-48 opacity-60 dark:invert sm:-right-32 sm:w-64"
        >
          <Image src="/images/Group (1).svg" alt="" width={316} height={300} className="h-auto w-full" />
        </motion.div>

        {/* Right Plant Bottom (Item 2) */}
        <motion.div
          variants={itemVariants}
          className="pointer-events-none absolute -right-8 bottom-[15%] z-0 w-32 opacity-60 dark:invert sm:-right-20 sm:w-48"
        >
          <Image src="/images/Group (2).svg" alt="" width={253} height={343} className="h-auto w-full" />
        </motion.div>
      </div>
    </motion.div>
  );
}
