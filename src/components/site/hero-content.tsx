"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function HeroContent({ base }: { base: string }) {
  const transition = { duration: 0.8, ease: [0.16, 1, 0.3, 1] };

  return (
    <div className="flex w-full flex-col justify-center lg:w-1/2">
      {/* 1. Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: 0 }}
        className="font-display text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-7xl"
      >
        We provide the <br /> best food for you
      </motion.h1>

      {/* 4. Description (Last in sequence as requested) */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: 0.45 }}
        className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
      >
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </motion.p>

      {/* 2. Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: 0.15 }}
        className="mt-10 flex flex-wrap gap-4"
      >
        <Button
          asChild
          size="lg"
          className="rounded-md bg-foreground px-8 text-background hover:bg-foreground/90 shadow-lg"
        >
          <Link href={`${base}/menu`}>Menu</Link>
        </Button>
        <Button asChild size="lg" className="rounded-md px-8 shadow-lg">
          <Link href={`${base}/reservation`}>Book a table</Link>
        </Button>
      </motion.div>

      {/* 3. Socials */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: 0.3 }}
        className="mt-20 flex items-center gap-4"
      >
        <div className="flex gap-3">
          <a
            href="#"
            className="flex size-10 items-center justify-center rounded-full border border-border/80 text-foreground transition-colors hover:bg-muted"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
          <a
            href="#"
            className="flex size-10 items-center justify-center rounded-full border border-border/80 text-foreground transition-colors hover:bg-muted"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
          <a
            href="#"
            className="flex size-10 items-center justify-center rounded-full border border-border/80 text-foreground transition-colors hover:bg-muted"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
            </svg>
          </a>
        </div>
        <div className="h-[2px] w-16 bg-border/80"></div>
      </motion.div>
    </div>
  );
}
