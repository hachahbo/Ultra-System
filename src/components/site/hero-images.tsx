"use client";

import { motion } from "framer-motion";

export function HeroImages({ images }: { images?: string[] }) {
  const main = images?.[0] ?? "/images/orendezvous.tanger_1777049699_3882496730852669917_73557593345.jpg";
  const pop = images?.[1] ?? "/images/Gemini_Generated_Image_izo3jjizo3jjizo3.png";

  return (
    <div className="relative mt-12 flex w-full justify-center lg:mt-0 lg:w-1/2">
      <div className="relative flex h-[500px] w-full max-w-[400px] items-center justify-center sm:h-[600px]">
        {/* === Phase 1: Background Layer (z-index: 0) The SVGs === */}

        {/* Left Plant (Item 4) */}
        <motion.div
          className="pointer-events-none absolute -left-16 top-10 z-0 w-64 opacity-60 dark:invert sm:-left-32 sm:top-20"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0, rotate: [-2, 2, -2] }}
          transition={{
            default: { delay: 0.8, duration: 0.8, ease: "easeOut" },
            rotate: { repeat: Infinity, duration: 5, ease: "easeInOut" }
          }}
        >
          <img src="/images/Group (3).svg" alt="" className="h-auto w-full object-contain" />
        </motion.div>

        {/* Right Plant Top (Item 3) */}
        <motion.div
          className="pointer-events-none absolute -right-16 top-[5%] z-0 w-48 opacity-60 dark:invert sm:-right-32 sm:w-64"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0, rotate: [1.5, -1.5, 1.5] }}
          transition={{
            default: { delay: 0.8, duration: 0.8, ease: "easeOut" },
            rotate: { repeat: Infinity, duration: 6, ease: "easeInOut" }
          }}
        >
          <img src="/images/Group (1).svg" alt="" className="h-auto w-full" />
        </motion.div>

        {/* Right Plant Bottom (Item 2) */}
        <motion.div
          className="pointer-events-none absolute -right-8 bottom-[15%] z-0 w-32 opacity-60 dark:invert sm:-right-20 sm:w-48"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0, rotate: [2, -2, 2] }}
          transition={{
            default: { delay: 0.8, duration: 0.8, ease: "easeOut" },
            rotate: { repeat: Infinity, duration: 4.5, ease: "easeInOut" }
          }}
        >
          <img src="/images/Group (2).svg" alt="" className="h-auto w-full" />
        </motion.div>

        {/* === Phase 2: Midground Layer (z-index: 10) Main Reveal === */}
        <motion.div
          className="relative z-10 h-full w-[90%] overflow-hidden rounded-t-[100px] rounded-br-[60px] rounded-bl-[20px] shadow-2xl"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img src={main} alt="Restaurant interior" className="h-full w-full object-cover" />
        </motion.div>

        {/* === Phase 3: Foreground Layer (z-index: 20) Pop === */}
        <motion.div
          className="absolute -left-12 bottom-[15%] z-20 w-[65%] sm:-left-20"
          initial={{ opacity: 0, scale: 0, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.4 }}
        >
          <div className="aspect-square w-full overflow-hidden rounded-full shadow-2xl ring-4 ring-background">
            <img
              src={pop}
              alt="Delicious food plate"
              className="h-full w-full scale-[1.25] object-cover object-center"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
