"use client";

import { motion } from "framer-motion";

export function HeroImages({ images }: { images?: string[] }) {
  const main = images?.[0] ?? "/images/orendezvous.tanger_1777049699_3882496730852669917_73557593345.jpg";
  const pop = images?.[1] ?? "/images/Gemini_Generated_Image_izo3jjizo3jjizo3.png";

  return (
    <div className="absolute inset-0 z-0 flex w-full items-center justify-center lg:relative lg:mt-0 lg:w-1/2">
      <div className="relative flex h-full min-h-[500px] w-full max-w-[400px] items-center justify-center lg:h-[600px]">
        {/* === Phase 1: Background Layer (z-index: 0) The SVGs === */}

        {/* Left Plant (Item 4) */}
        <div
          className="pointer-events-none absolute -left-16 top-10 z-0 w-64 opacity-60 dark:invert sm:-left-32 sm:top-20"
        >
          <img src="/images/Group (3).svg" alt="" className="h-auto w-full object-contain" />
        </div>

        {/* Right Plant Top (Item 3) */}
        <div
          className="pointer-events-none absolute -right-16 top-[5%] z-0 w-48 opacity-60 dark:invert sm:-right-32 sm:w-64"
        >
          <img src="/images/Group (1).svg" alt="" className="h-auto w-full" />
        </div>

        {/* Right Plant Bottom (Item 2) */}
        <div
          className="pointer-events-none absolute -right-8 bottom-[15%] z-0 w-32 opacity-60 dark:invert sm:-right-20 sm:w-48"
        >
          <img src="/images/Group (2).svg" alt="" className="h-auto w-full" />
        </div>

        {/* === Phase 2: Midground Layer (z-index: 10) Main Reveal === */}
        <div
          className="relative z-10 h-full w-[90%] overflow-hidden rounded-t-[100px] rounded-br-[60px] rounded-bl-[20px] shadow-2xl"
        >
          <img src={main} alt="Restaurant interior" className="h-full w-full object-cover" />
        </div>

        {/* === Phase 3: Foreground Layer (z-index: 20) Pop === */}
        <div
          className="hidden lg:block absolute -left-12 bottom-[15%] z-20 w-[65%] sm:-left-20"
        >
          <div className="aspect-square w-full overflow-hidden rounded-full shadow-2xl ring-4 ring-background">
            <img
              src={pop}
              alt="Delicious food plate"
              className="h-full w-full scale-[1.25] object-cover object-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
