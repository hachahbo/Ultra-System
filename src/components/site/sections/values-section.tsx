import Image from "next/image";

export function ValuesSection() {
  return (
    <section className="relative overflow-hidden bg-[#fdf8f4] dark:bg-background px-6 py-20 md:px-12 md:py-32">
      {/* Background SVGs */}
      <div className="pointer-events-none absolute left-0 top-0 opacity-40 mix-blend-multiply dark:opacity-10 dark:mix-blend-screen">
        <Image src="/images/Group.svg" alt="" width={400} height={400} />
      </div>
      <div className="pointer-events-none absolute right-0 top-1/2 opacity-40 mix-blend-multiply dark:opacity-10 dark:mix-blend-screen">
        <Image src="/images/Group (4).svg" alt="" width={350} height={350} />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/4 opacity-40 mix-blend-multiply dark:opacity-10 dark:mix-blend-screen">
        <Image src="/images/Group (5).svg" alt="" width={450} height={450} />
      </div>

      <div className="relative mx-auto max-w-7xl z-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8 lg:gap-16">
          {/* Column 1: Partage (Image Top, Text Bottom) */}
          <div className="flex flex-col gap-6">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-b-2xl rounded-t-[150px] shadow-sm">
              <Image
                src="/images/orendezvous.tanger_1770820323_3830240942847468663_73557593345.jpg"
                alt="Partage"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="mb-4 font-serif text-3xl font-bold text-[#b85a30] dark:text-[#df7a4d] md:text-4xl">
                Partage
              </h3>
              <p className="font-sans text-base leading-relaxed text-[#5e3b2b] dark:text-stone-300">
                Chez Maison Loko, le partage est au cœur de notre philosophie. Notre lieu est un espace où chacun peut trouver son bonheur, que ce soit pour savourer un café, un repas, ou simplement pour se détendre. Notre ambition est de créer des moments uniques de convivialité et de partage.
              </p>
            </div>
          </div>

          {/* Column 2: Bienveillance (Text Top, Image Bottom) */}
          <div className="flex flex-col-reverse gap-6 md:flex-col">
            <div>
              <h3 className="mb-4 font-serif text-3xl font-bold text-[#b85a30] dark:text-[#df7a4d] md:text-4xl">
                Bienveillance
              </h3>
              <p className="font-sans text-base leading-relaxed text-[#5e3b2b] dark:text-stone-300">
                La bienveillance guide chaque action chez Maison Loko. De l'accueil chaleureux à notre engagement pour l'environnement, nous veillons à prendre soin de nos clients comme de notre planète. Chez nous, vous êtes plus que des visiteurs, vous êtes des amis.
              </p>
            </div>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-b-[150px] rounded-t-2xl shadow-sm">
              <Image
                src="/images/orendezvous.tanger_1773861948_3855755933193214716_73557593345.jpg"
                alt="Bienveillance"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Column 3: Exigence (Image Top, Text Bottom) */}
          <div className="flex flex-col gap-6">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-b-2xl rounded-t-[150px] shadow-sm">
              <Image
                src="/images/orendezvous.tanger_1770820323_3830240943015229907_73557593345.jpg"
                alt="Exigence"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="mb-4 font-serif text-3xl font-bold text-[#b85a30] dark:text-[#df7a4d] md:text-4xl">
                Exigence
              </h3>
              <p className="font-sans text-base leading-relaxed text-[#5e3b2b] dark:text-stone-300">
                L'exigence est le maître-mot de notre cuisine. Chez Maison Loko, nous sommes fiers de servir des plats faits maison, élaborés avec des produits de saison et de haute qualité. Chaque assiette reflète notre passion pour l'excellence culinaire, pour le plaisir de vos papilles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
