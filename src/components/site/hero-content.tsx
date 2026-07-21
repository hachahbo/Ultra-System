"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export function HeroContent({
  base,
  activeStep,
  steps,
  ctaLabel,
}: {
  base: string;
  activeStep: number;
  steps: Array<{ title: string; highlightWord: string; subtitle: string; label: string }>;
  ctaLabel?: string;
}) {
  const currentStep = steps[activeStep] ?? steps[0];

  const renderHeadline = (text: string, highlight: string) => {
    if (text.includes("\n")) {
      const lines = text.split("\n");
      return (
        <>
          {lines.map((line, idx) => {
            const hasHighlight = line.toLowerCase().includes(highlight.toLowerCase());
            if (hasHighlight) {
              const parts = line.split(new RegExp(`(${highlight})`, "i"));
              return (
                <span key={idx} className="block">
                  {parts.map((p, pIdx) => 
                    p.toLowerCase() === highlight.toLowerCase() ? (
                      <span key={pIdx} className="text-[#FF6B35] italic font-serif font-normal lowercase tracking-wide">{p}</span>
                    ) : p
                  )}
                </span>
              );
            }
            return (
              <span key={idx} className="block">
                {line}
              </span>
            );
          })}
        </>
      );
    }

    if (text.toLowerCase().includes(highlight.toLowerCase())) {
      const parts = text.split(new RegExp(`(${highlight})`, "i"));
      return (
        <>
          {parts.map((part, i) => 
            part.toLowerCase() === highlight.toLowerCase() ? (
              <span key={i} className="text-[#FF6B35] italic font-serif font-normal lowercase tracking-wide">{part}</span>
            ) : part
          )}
        </>
      );
    }
    return text;
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative z-10 flex w-full flex-col justify-end lg:justify-center lg:w-[50%] h-full min-h-[420px]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="flex flex-col items-start"
        >
          {/* 0. Top Label Tag */}
          <div className="ml-3 text-[11px] md:text-xs tracking-[0.25em] font-black text-[#FF6B35] uppercase mb-3 flex items-center gap-2">
            <span className="h-[2px] w-8 bg-[#FF6B35] inline-block shrink-0 rounded-full" />
            {currentStep.label}
          </div>

          {/* 1. Title with adaptive Light / Dark text color */}
          <h1 
            className="font-serif ml-3 font-medium leading-[1.05] tracking-tight mb-4 text-[#1c1712] dark:text-[#F4ECE3]"
            style={{ 
              fontSize: "clamp(44px, 5.4vw, 76px)" 
            }}
          >
            {renderHeadline(currentStep.title, currentStep.highlightWord)}
          </h1>

          {/* 4. Description */}
          <div className="hidden lg:block mt-3 max-w-md">
            <p className="ml-3 text-base leading-relaxed text-muted-foreground/90 sm:text-lg mb-5">
              {currentStep.subtitle}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 2. Buttons */}
      <motion.div
        variants={itemVariants}
        className="mt-4 md:mt-5 ml-3 flex flex-wrap gap-4"
      >
        <Button
          asChild
          className="rounded-full bg-foreground px-9 py-6 text-base font-semibold text-background hover:bg-foreground/90 shadow-lg transition-all"
        >
          <Link href={`${base}/menu`}>{ctaLabel ?? "Menu"}</Link>
        </Button>
        <Button
          asChild
          className="rounded-full bg-[#FF6B35] px-9 py-6 text-base font-semibold text-white hover:bg-[#FF6B35]/90 shadow-[0_8px_20px_rgba(255,107,53,0.35)] hover:shadow-[0_12px_24px_rgba(255,107,53,0.45)] group transition-all duration-300 flex items-center gap-2"
        >
          <Link href={`${base}/reservation`}>
            Book a table <span className="transition-transform duration-300 group-hover:translate-x-1 inline-block">→</span>
          </Link>
        </Button>
      </motion.div>

      {/* 3. Opening Hours & Location Info */}
      <motion.div variants={itemVariants} className="hidden lg:flex flex-col sm:flex-row gap-8 sm:gap-12 mt-8 ml-3">
        <div className="flex flex-col gap-1">
          <h4 className="text-[10px] font-black tracking-[0.25em] text-foreground/50 uppercase">
            Opening hours
          </h4>
          <p className="text-muted-foreground font-medium text-sm md:text-base">
            lun–dim · 11h00 – 23h00
          </p>
        </div>
        
        <div className="hidden sm:block w-[1px] bg-border/40 self-stretch" />
        
        <div className="flex flex-col gap-1">
          <h4 className="text-[10px] font-black tracking-[0.25em] text-foreground/50 uppercase">
            Location
          </h4>
          <p className="text-muted-foreground font-medium text-sm md:text-base flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-[#FF6B35]" />
            Rue Lafayette, Tanger
          </p>
        </div>
      </motion.div>

      {/* 5. Socials & Horizontal Line */}
      <motion.div
        variants={itemVariants}
        className="hidden lg:flex mt-10 items-center gap-6 w-full max-w-sm ml-3"
      >
        <div className="flex gap-4 shrink-0">
          <a
            href="#"
            className="flex size-10 items-center justify-center rounded-full border border-border/80 text-foreground transition-all duration-300 hover:border-[#FF6B35] hover:text-[#FF6B35] hover:bg-muted"
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
            className="flex size-10 items-center justify-center rounded-full border border-border/80 text-foreground transition-all duration-300 hover:border-[#FF6B35] hover:text-[#FF6B35] hover:bg-muted"
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
            className="flex size-10 items-center justify-center rounded-full border border-border/80 text-foreground transition-all duration-300 hover:border-[#FF6B35] hover:text-[#FF6B35] hover:bg-muted"
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
        <div className="h-[1px] flex-1 bg-border/40" />
      </motion.div>
    </motion.div>
  );
}
