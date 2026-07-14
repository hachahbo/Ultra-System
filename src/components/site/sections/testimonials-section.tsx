import Image from "next/image";

const testimonials = [
  {
    id: 1,
    text: "Le salon, est un véritable cocon où l'on imagine bien se poser pour discuter entre amis ou bien bouquiner, entouré de livres et de beaux objets.",
    Logo: () => (
      <div className="">
        
      </div>
    ),
  },
  {
    id: 2,
    text: "C'est un lieu de vie à usages multiples, idéal pour se retrouver autour d'un expresso, chaleureux pour déjeuner et réconfortant pour bouquiner un temps.",
    Logo: () => (
      <div className="">
        
      </div>
    ),
  },
  {
    id: 3,
    text: "Le croque de la semaine fait grand bruit. Original et gourmand il ravit les papilles par ses saveurs harmonieusement combinées.",
    Logo: () => (
      <div className="">

      </div>
    ),
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden bg-[#fdf8f4] dark:bg-background py-20">
      {/* Background Sketch (Pan) */}
      <div className="absolute -left-50 top-20 pointer-events-none opacity-50 dark:opacity-20">
        <Image
          src="/images/maqla.svg"
          alt="Sketch Background"
          width={800}
          height={800}
          className="object-contain w-[800px] h-[800px] dark:invert"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
        {/* Header - Hiding for this specific cleaner look, or we can keep it? 
            The screenshot doesn't show a header, but it's good for structure. Let's keep it visually hidden or subtle */}
        <div className="text-center mb-16 sr-only">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Our Happy Customers
          </h2>
        </div>

        {/* Testimonials Cards Row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 lg:gap-10">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="flex flex-col justify-between rounded-[32px] bg-[#eedcc6] p-8 md:p-10 shadow-sm dark:bg-card dark:border dark:border-border transition-colors duration-300"
            >
              <div>
                {/* Large Quote Mark */}
                <div className="font-serif text-6xl leading-none text-[#1a2b3c] dark:text-muted-foreground mb-4">
                  “
                </div>

                {/* Text */}
                <p className="font-sans text-[#1a2b3c] dark:text-stone-300 leading-relaxed text-[15px] mb-12">
                  {t.text}
                </p>
              </div>

              {/* Logo / Brand at Bottom */}
              <div className="mt-auto">
                <t.Logo />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
