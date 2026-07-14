import Link from "next/link";
import { Button } from "@/components/ui/button";

export function WelcomeSection({
  base,
  heading,
  body,
}: {
  base: string;
  heading?: string;
  body: string;
}) {
  return (
    <section className="relative overflow-hidden bg-muted py-16 md:py-32">
      {/* Decorative Botanicals */}
      <div className="pointer-events-none absolute right-[5%] top-[10%] w-64 dark:invert  sm:w-80">
        <img src="/images/Group (4).svg" alt="" className="h-auto w-full" />
      </div>
      <div className="pointer-events-none absolute bottom-[10%] right-[30%] w-48 dark:invert  sm:w-64">
        <img src="/images/Group.svg" alt="" className="h-auto w-full" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 md:flex-row lg:px-8">
        {/* Left Image */}
        <div className="relative w-full md:w-1/2 flex justify-center">
          <div className="aspect-square w-full max-w-[380px] overflow-hidden rounded-full shadow-2xl">
            <img
              src="/images/welcome-chicken.png"
              alt="Chicken dish"
              className="h-full w-full scale-[1.25] object-cover object-center"
            />
          </div>
        </div>

        {/* Right Content */}
        <div className="flex w-full flex-col justify-center md:w-1/2">
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {heading ?? "Welcome to Our Restaurant"}
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            {body}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button asChild size="lg" className="rounded-md bg-foreground px-8 p-5 text-background hover:bg-foreground/90 shadow-lg">
              <Link href={`${base}/menu`}>Menu</Link>
            </Button>
            <Button asChild size="lg" className="rounded-md px-8 p-5 shadow-lg">
              <Link href={`${base}/reservation`}>Book a table</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
