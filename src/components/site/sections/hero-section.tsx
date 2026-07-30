"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HeroContent } from "@/components/site/hero-content";
import { HeroImages } from "@/components/site/hero-images";

export function HeroSection({
  base,
  headline,
  sub,
  ctaLabel,
  hours,
  address,
  images,
}: {
  base: string;
  headline?: string;
  sub?: string;
  ctaLabel?: string;
  hours?: string | null;
  address?: string | null;
  images?: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const t = useTranslations("Hero");

  // Step 1 falls back to the generic default copy when the operator hasn't
  // written its own headline/sub; steps 2-3 are always app-level copy.
  const steps = [
    {
      title: headline ?? t("step1Title"),
      highlightWord: t("step1Highlight"),
      subtitle: sub ?? t("step1Sub"),
      label: t("step1Label"),
    },
    {
      title: t("step2Title"),
      highlightWord: t("step2Highlight"),
      subtitle: t("step2Sub"),
      label: t("step2Label"),
    },
    {
      title: t("step3Title"),
      highlightWord: t("step3Highlight"),
      subtitle: t("step3Sub"),
      label: t("step3Label"),
    },
  ];

  const handleScrollDown = () => {
    // Find the next section element in the DOM relative to the Hero section
    const nextSection = containerRef.current?.nextElementSibling;
    if (nextSection) {
      // Use block: "center" to center the specials section in the viewport, ensuring all dish cards are visible
      nextSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section 
      ref={containerRef}
      className="relative w-full overflow-hidden bg-background"
    >
      {/* 1. Main Grid Content Wrapper */}
      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col items-start justify-end min-h-[520px] sm:min-h-[580px] lg:min-h-0 pt-16 pb-4 sm:pb-8 lg:pt-0 lg:pb-24 px-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <HeroContent
          base={base}
          activeStep={activeStep}
          steps={steps}
          ctaLabel={ctaLabel}
          hours={hours}
          address={address}
        />
        <HeroImages images={images} activeStep={activeStep} setActiveStep={setActiveStep} />
      </div>

      {/* 2. Timeline Navigation - Completely separated, direct child of section, positioned on viewport edge */}
      <div className="hidden xl:flex absolute right-12 top-1/2 -translate-y-1/2 flex-col gap-6 text-[11px] font-black tracking-[0.25em] uppercase select-none z-30">
        {steps.map((_, idx) => {
          const isActive = activeStep === idx;
          const label = idx === 0 ? t("timeline1") : idx === 1 ? t("timeline2") : t("timeline3");
          return (
            <button 
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`flex items-center transition-all duration-300 outline-none border-none bg-transparent cursor-pointer text-left ${
                isActive ? "text-[#FF6B35]" : "text-muted-foreground/35 hover:text-muted-foreground"
              }`}
            >
              <span className="font-sans text-xs w-6 shrink-0">0{idx + 1}</span>
              <div className="w-14 flex items-center justify-start shrink-0">
                {isActive ? (
                  <motion.span 
                    layoutId="timeline-active-line"
                    className="h-[1.5px] w-10 bg-[#FF6B35] inline-block"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : (
                  <span className="h-[1.5px] w-4 bg-muted-foreground/15 inline-block" />
                )}
              </div>
              <span className="text-[10px] tracking-[0.3em] font-bold">{label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Scroll Down Indicator - Hidden on mobile (hidden sm:flex) */}
      <button
        onClick={handleScrollDown}
        className="hidden sm:flex absolute bottom-4 left-1/2 -translate-x-1/2 flex-col items-center gap-1 group cursor-pointer z-30 outline-none border-none bg-transparent"
        aria-label={t("scrollDown")}
      >
        <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground/60 group-hover:text-[#FF6B35] transition-colors duration-300">
          {t("scroll")}
        </span>
        <motion.span 
          className="text-[#FF6B35] text-sm font-black transition-colors"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          ↓
        </motion.span>
      </button>
    </section>
  );
}
