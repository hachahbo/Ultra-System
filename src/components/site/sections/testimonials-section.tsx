import Image from "next/image";
import type { Testimonial } from "@/lib/types";

export function TestimonialsSection({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#fdf8f4] dark:bg-background py-20">
      {/* Background Sketch (Pan) */}
      <div className="absolute -left-50 top-20 pointer-events-none opacity-50 dark:opacity-20">
        <Image
          src="/images/maqla.svg"
          alt=""
          width={800}
          height={800}
          className="object-contain w-[800px] h-[800px] dark:invert"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
        <div className="text-center mb-16 sr-only">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Ce que nos clients en disent
          </h2>
        </div>

        {/* Testimonials Cards Row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 lg:gap-10">
          {items.slice(0, 3).map((t, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-[32px] bg-[#eedcc6] p-8 md:p-10 shadow-sm dark:bg-card dark:border dark:border-border transition-colors duration-300"
            >
              <div>
                <div className="font-serif text-6xl leading-none text-[#1a2b3c] dark:text-muted-foreground mb-4">
                  &ldquo;
                </div>
                <p className="font-sans text-[#1a2b3c] dark:text-stone-300 leading-relaxed text-[15px] mb-12">
                  {t.text}
                </p>
              </div>
              {t.author && (
                <p className="mt-auto font-sans text-sm font-medium text-[#1a2b3c]/70 dark:text-muted-foreground">
                  — {t.author}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
