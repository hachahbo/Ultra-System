import Image from "next/image";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Ama Ampomah",
    title: "CEO & Founder Inc",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1bfa8ea?w=150&h=150&fit=crop&crop=faces",
    text: "Lorem ipsum dolor sit amet consectetur. Tortor massa nisl quam sit. Vitae congue ultrices neque penatibus mi in quisque. Leo in cursus enim magnis ante. Proin iaculis platea ipsum sagittis ac eu aliquam quis. Ornare tincidunt tempus semper",
  },
  {
    name: "Kweku Asamoah",
    title: "CEO & Founder Inc",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces",
    text: "Lorem ipsum dolor sit amet consectetur. Tortor massa nisl quam sit. Vitae congue ultrices neque penatibus mi in quisque. Leo in cursus enim magnis ante. Proin iaculis platea ipsum sagittis ac eu aliquam quis. Ornare tincidunt tempus semper",
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden bg-background py-20">
      {/* Background Sketch (Pan) */}
      <div className="absolute -left-50 top-20  pointer-events-none">
        <Image
          src="/images/maqla.svg"
          alt="Sketch Background"
          width={800}
          height={800}
          className="object-contain w-[800px] h-[800px] dark:invert"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Our Happy Customers
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-muted-foreground">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          </p>
        </div>

        {/* Testimonials Cards Row */}
        <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-12 lg:gap-16">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="relative mt-10 w-full max-w-md bg-card rounded-[24px] p-8 pt-12 shadow-md border border-border mx-auto md:mx-0"
            >
              {/* Avatar Hack */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                <div className="w-20 h-20 rounded-full border-4 border-card bg-muted overflow-hidden shadow-sm">
                  <Image
                    src={t.avatar}
                    alt={t.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Stars */}
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill="#FFD700"
                    color="#FFD700"
                  />
                ))}
              </div>

              {/* Text */}
              <p className="text-sm text-center text-muted-foreground leading-relaxed mb-8">
                {t.text}
              </p>

              {/* Author */}
              <div className="text-center">
                <h4 className="font-bold text-card-foreground">{t.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t.title}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mt-12">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <div className="w-2 h-2 rounded-full bg-muted"></div>
          <div className="w-2 h-2 rounded-full bg-muted"></div>
          <div className="w-2 h-2 rounded-full bg-muted"></div>
        </div>
      </div>
    </section>
  );
}
