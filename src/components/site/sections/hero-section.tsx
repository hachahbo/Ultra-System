"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { HeroContent } from "@/components/site/hero-content";
import { HeroImages } from "@/components/site/hero-images";

export function HeroSection({
  base,
  headline,
  sub,
  ctaLabel,
  images,
}: {
  base: string;
  headline?: string;
  sub?: string;
  ctaLabel?: string;
  images?: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: headline ?? "We provide\nthe\nbest food for\nyou",
      highlightWord: "food",
      subtitle: sub ?? "Une cantine de quartier au cœur de Tanger — assiettes de saison, vins nature et une salle chaleureuse où l'on se sent comme à la maison.",
      label: "CANTINE · BISTROT — TANGER",
    },
    {
      title: "Crafted\nwith\nlocal love &\npassion",
      highlightWord: "passion",
      subtitle: "Chaque plat est une composition d'ingrédients locaux issus des meilleurs producteurs de la région de Tanger-Tétouan.",
      label: "ARTISANAL · LOCAVORE",
    },
    {
      title: "Savor\nthe\nauthentic\nexperience",
      highlightWord: "experience",
      subtitle: "Rejoignez-nous pour un moment convivial autour de notre table. Réservez votre place dès aujourd'hui pour vivre l'expérience Darna.",
      label: "PARTAGE · CONVIVIALITÉ",
    }
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
        <HeroContent base={base} activeStep={activeStep} steps={steps} ctaLabel={ctaLabel} />
        <HeroImages images={images} activeStep={activeStep} setActiveStep={setActiveStep} />
      </div>

      {/* 2. Timeline Navigation - Completely separated, direct child of section, positioned on viewport edge */}
      <div className="hidden xl:flex absolute right-12 top-1/2 -translate-y-1/2 flex-col gap-6 text-[11px] font-black tracking-[0.25em] uppercase select-none z-30">
        {steps.map((_, idx) => {
          const isActive = activeStep === idx;
          const label = idx === 0 ? "REVEAL" : idx === 1 ? "ASSEMBLE" : "SETTLE";
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
        aria-label="Défiler vers le bas"
      >
        <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground/60 group-hover:text-[#FF6B35] transition-colors duration-300">
          SCROLL
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
