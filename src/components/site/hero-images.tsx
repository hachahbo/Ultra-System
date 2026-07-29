"use client";

import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";

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

export function HeroImages({
  images,
  activeStep = 0,
  className,
}: {
  images?: string[];
  activeStep?: number;
  setActiveStep?: (step: number) => void;
  className?: string;
}) {
  // Default high quality O Rendez-Vous hero images
  const main0 = images?.[0] ?? "/images/orendezvous/hero-default.webp";
  const pop0 = images?.[1] ?? "/images/orendezvous/hero-pop-default.webp";

  // Step 1 images (Kitchen / Dining visual)
  const main1 = images?.[2] ?? "/images/orendezvous/orendezvous.tanger_1782412303_3927481511788834209_73557593345.jpg";
  const pop1 = images?.[3] ?? "/images/orendezvous/orendezvous.tanger_1770820323_3830240942847468663_73557593345.jpg";

  // Step 2 images (Restaurant Interior visual)
  const main2 = images?.[4] ?? "/images/orendezvous/orendezvous.tanger_1782412303_3927481512191507130_73557593345.jpg";
  const pop2 = images?.[5] ?? "/images/orendezvous/orendezvous.tanger_1783019424_3932574417688072480_73557593345.jpg";

  const getImagesForStep = () => {
    switch (activeStep) {
      case 1:
        return { main: main1, pop: pop1 };
      case 2:
        return { main: main2, pop: pop2 };
      default:
        return { main: main0, pop: pop0 };
    }
  };

  const current = getImagesForStep();

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`absolute inset-0 z-0 flex w-full items-center justify-center lg:relative lg:mt-0 lg:w-1/2 lg:justify-end lg:pr-44 ${className ?? ""}`}
    >
      {/* Inner Images block */}
      <div className="relative flex h-full min-h-[520px] w-full max-w-[420px] items-center justify-center lg:h-[620px]">
        {/* === Phase 2: Midground Layer (z-index: 10) Main Reveal === */}
        <div className="relative z-10 h-full w-[90%]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full w-full overflow-hidden rounded-t-[150px] rounded-br-[70px] rounded-bl-[35px] shadow-2xl"
            >
              <Image
                src={current.main}
                alt="Restaurant interior"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 90vw"
                className="object-cover brightness-[0.80] lg:brightness-100 transition-all duration-300"
              />
              {/* Dark overlay specifically on mobile for extra contrast */}
              <div className="absolute inset-0 bg-black/35 lg:hidden pointer-events-none" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* === Phase 3: Foreground Layer (z-index: 20) Pop === */}
        <div className="hidden lg:block absolute -left-14 bottom-[18%] z-20 w-[58%] sm:-left-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, scale: 0.85, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.85, rotate: 15 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative aspect-square w-full overflow-hidden rounded-full shadow-2xl ring-4 ring-background"
            >
              <Image
                src={current.pop}
                alt="Delicious food plate"
                fill
                sizes="35vw"
                className="scale-[1.25] object-cover object-center"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* === Phase 1: Background Layer (z-index: 0) The SVGs === */}
        
        {/* Left Plant */}
        <motion.div
          variants={itemVariants}
          className="pointer-events-none absolute -left-16 top-10 z-0 w-64 opacity-60 dark:invert sm:-left-32 sm:top-20"
        >
          <Image src="/images/Group (3).svg" alt="" width={350} height={321} className="h-auto w-full object-contain" />
        </motion.div>

        {/* Right Plant Top */}
        <motion.div
          variants={itemVariants}
          className="pointer-events-none absolute -right-16 top-[5%] z-0 w-48 opacity-60 dark:invert sm:-right-32 sm:w-64"
        >
          <Image src="/images/Group (1).svg" alt="" width={316} height={300} className="h-auto w-full" />
        </motion.div>

        {/* Right Plant Bottom */}
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
