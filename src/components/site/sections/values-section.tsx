"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { ValueItem } from "@/lib/types";

// The card image alternates image-top/text-bottom vs text-top/image-bottom
// per column purely for visual rhythm — cosmetic, not content-driven.
const COLUMN_LAYOUT = ["normal", "reverse", "normal"] as const;

export function ValuesSection({ items }: { items: ValueItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#fdf8f4] dark:bg-background px-6 py-20 md:px-12 md:py-32">
      {/* Background SVGs */}
      <div className="pointer-events-none absolute left-0 top-0 opacity-40 mix-blend-multiply dark:opacity-10 dark:mix-blend-screen">
        <Image src="/images/Group.svg" alt="" width={400} height={400} />
      </div>
      <div className="pointer-events-none absolute right-0 top-1/2 opacity-40 mix-blend-multiply dark:opacity-10 dark:mix-blend-screen">
        <Image src="/images/Group (4).svg" alt="" width={350} height={350} />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/4 opacity-40 mix-blend-multiply dark:opacity-10 dark:mix-blend-screen">
        <Image src="/images/Group (5).svg" alt="" width={450} height={450} />
      </div>

      <div className="relative mx-auto max-w-[1600px] z-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8 lg:gap-16">
          {items.slice(0, 3).map((item, i) => {
            const reverse = COLUMN_LAYOUT[i % COLUMN_LAYOUT.length] === "reverse";
            const image = (
              <div
                className={
                  reverse
                    ? "relative aspect-[4/5] w-full overflow-hidden rounded-b-[150px] rounded-t-2xl shadow-sm"
                    : "relative aspect-[4/5] w-full overflow-hidden rounded-b-2xl rounded-t-[150px] shadow-sm"
                }
              >
                <Image src={item.image_url} alt={item.title} fill className="object-cover" />
              </div>
            );
            const text = (
              <div>
                <h3 className="mb-4 font-serif text-3xl font-bold text-[#b85a30] dark:text-[#df7a4d] md:text-4xl">
                  {item.title}
                </h3>
                <p className="font-sans text-base leading-relaxed text-[#5e3b2b] dark:text-stone-300">
                  {item.body}
                </p>
              </div>
            );
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.1 }}
                viewport={{ once: true, margin: "-20px" }}
                className={reverse ? "flex flex-col-reverse gap-6 md:flex-col" : "flex flex-col gap-6"}
              >
                {reverse ? (
                  <>
                    {text}
                    {image}
                  </>
                ) : (
                  <>
                    {image}
                    {text}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
