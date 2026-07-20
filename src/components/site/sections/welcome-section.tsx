import React from "react";
import Image from "next/image";

export function WelcomeSection({
  heading,
  body,
  images,
}: {
  heading?: string;
  body: string;
  images: string[];
}) {
  return (
    <section className="hidden md:block bg-background py-16 md:py-32 overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Text Content */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-16 lg:gap-24">
          {/* Title */}
          <div className="w-full md:w-5/12">
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-foreground">
              {heading ?? "Bienvenue"}
            </h2>
          </div>

          {/* Description */}
          <div className="w-full md:w-7/12 flex flex-col justify-start pt-2">
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {body}
            </p>
          </div>
        </div>

        {/* Image Grid — theme-driven (0019); the section itself is only
            rendered by the caller when `body` is set, so `images` may still
            legitimately be empty (an owner filled in copy but no gallery
            yet) — skip the grid entirely rather than show empty tiles. */}
        {images.length > 0 && (
          <div className="mt-16 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {images.slice(0, 4).map((src, i) => (
              <div
                key={src}
                className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-muted shadow-md transition-transform duration-500 hover:scale-[1.02]"
              >
                <Image
                  src={src}
                  alt={`Ambiance ${i + 1}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
