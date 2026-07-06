"use client";

import { motion } from "framer-motion";

export function HeroImages() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative mt-12 flex w-full justify-center lg:mt-0 lg:w-1/2"
    >
      <div className="relative h-[500px] w-full max-w-[400px] sm:h-[600px]">
        {/* Main Arch Image */}
        <div className="absolute right-0 top-0 h-full w-[90%] overflow-hidden rounded-t-[100px] rounded-br-[60px] rounded-bl-[20px] shadow-2xl">
          <img
            src="/images/orendezvous.tanger_1777049699_3882496730852669917_73557593345.jpg"
            alt="Restaurant interior"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Overlapping Plate */}
        <div className="absolute -left-12 bottom-[15%] w-[65%] sm:-left-20">
          <div className="aspect-square w-full overflow-hidden rounded-full shadow-2xl ring-4 ring-background">
            <img
              src="images/Gemini_Generated_Image_izo3jjizo3jjizo3.png"
              alt="Delicious food plate"
              className="h-full w-full scale-[1.25] object-cover object-center"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
