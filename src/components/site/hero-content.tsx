"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroContent({
  base,
  headline,
  sub,
  ctaLabel,
}: {
  base: string;
  headline?: string;
  sub?: string;
  ctaLabel?: string;
}) {
  const transition = { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div className="relative z-10 flex w-full flex-col justify-end lg:justify-center lg:w-1/2 h-full">
      {/* 1. Title */}
      <h1
        className="font-display ml-3 text-4xl font-bold leading-[1.1] tracking-tight text-white lg:text-foreground md:text-7xl"
      >
        {headline ?? (
          <>
            We provide the <br />{" "}
            <span className="text-[oklch(0.685_0.165_45)] lg:text-inherit">
              best food
            </span>{" "}
            for you
          </>
        )}
      </h1>

      {/* 4. Description & Opening Hours */}
      <div
        className="hidden lg:block mt-4 md:mt-6 max-w-md"
      >
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg mb-8">
          {sub ??
            "consectetur adipiscing dolore magna aliqua Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore."}
        </p>

      </div>

      {/* 2. Buttons */}
      <div
        className="mt-8 md:mt-10 ml-3 flex flex-wrap gap-4"
      >
        <Button
          asChild
          className="rounded-full bg-foreground px-8 py-6 text-base font-semibold text-background hover:bg-foreground/90 shadow-lg"
        >
          <Link href={`${base}/menu`}>{ctaLabel ?? "Menu"}</Link>
        </Button>
        <Button
          asChild
          className="rounded-full bg-[oklch(0.685_0.165_45)] px-8 py-6 text-base font-semibold text-white hover:opacity-90 shadow-lg"
        >
          <Link href={`${base}/reservation`}>Book a table</Link>
        </Button>
      </div>
        <div className="hidden lg:flex flex-col sm:flex-row gap-6 sm:gap-10 mt-8">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semobold tracking-[0.2em] text-foreground">
              Opening hours
            </h4>
            <p className="text-muted-foreground text-base sm:text-md">
              lun–dim · 11h00 – 23h00
            </p>
          </div>
          
          <div className="hidden sm:block w-[1px] bg-border/80 self-stretch" />
          
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold tracking-[0.2em] text-foreground ">
              Location
            </h4>
            <p className="text-muted-foreground text-md sm:text-md flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Rue Lafayette, Tanger
            </p>
          </div>
        </div>

      {/* 3. Socials */}
      <div
        className="hidden lg:flex mt-5 md:mt-20 items-center gap-4"
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
      </div>
    </div>
  );
}
