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
  return (
    <section className="relative w-full overflow-hidden bg-background">
      <div className="relative mx-auto flex min-h-[85dvh] max-w-7xl flex-col items-start justify-end gap-12 px-4 pb-12 pt-32 sm:px-6 lg:min-h-0 lg:flex-row lg:items-center lg:justify-center lg:px-8 lg:py-24">
        <HeroContent base={base} headline={headline} sub={sub} ctaLabel={ctaLabel} />
        <HeroImages images={images} />
      </div>
    </section>
  );
}
