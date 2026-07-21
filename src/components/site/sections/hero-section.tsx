"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
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
      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col items-start pt-5 justify-end gap-8 px-10 pb-20 pt-0 sm:px-6 lg:min-h-0 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:pb-24">
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
              className={`flex items-center transition-all duration-300 outline-none border-none bg-transparent cursor-pointer text-left ${isActive ? "text-[#FF6B35]" : "text-muted-foreground/35 hover:text-muted-foreground"
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

      {/* 3. Premium Glassmorphic Scroll Down Button */}
      <button
        onClick={handleScrollDown}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 group cursor-pointer z-30 outline-none border-none bg-transparent"
        aria-label="Défiler vers le bas"
      >
        <span className="text-[9px] font-black tracking-[0.3em] uppercase text-muted-foreground/50 group-hover:text-[#FF6B35] transition-colors duration-300">
          Scroll Down
        </span>
        <motion.div
          className="flex size-10 items-center justify-center rounded-full border border-border/80 bg-background/40 backdrop-blur-sm text-muted-foreground shadow-md transition-all duration-300 group-hover:border-[#FF6B35] group-hover:text-[#FF6B35] group-hover:shadow-[0_8px_20px_rgba(255,107,53,0.2)] group-hover:bg-[#FF6B35]/5"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-5 w-5 stroke-[2.5]" />
        </motion.div>
      </button>
    </section>
  );
}
