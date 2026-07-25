"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, Users, Music, Wine, Sparkles, Send, CheckCircle2, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EventsSectionProps {
  slug: string;
  restaurantName: string;
  phone?: string | null;
  whatsappNumber?: string | null;
}

type CategoryFilter = "all" | "music" | "theme" | "tasting";

interface EventItem {
  id: string;
  title: string;
  category: CategoryFilter;
  categoryLabel: string;
  date: string;
  time: string;
  description: string;
  image: string;
  status: "upcoming" | "tonight" | "soldout";
  statusLabel: string;
  price: string;
}

const EVENTS_DATA: EventItem[] = [
  {
    id: "jazz-night",
    title: "Soirée Jazz Live & Dîner Gourmand",
    category: "music",
    categoryLabel: "Musique Live",
    date: "Vendredi 31 Juillet 2026",
    time: "20:00 - 23:30",
    description: "Une soirée envoûtante avec le duo Jazz Tanger Trio. Menu d'exception 4 services accordé avec vins choisis.",
    image: "/images/orendezvous/orendezvous.tanger_1783019424_3932574417688072480_73557593345.jpg",
    status: "upcoming",
    statusLabel: "À venir",
    price: "Sur réservation",
  },
  {
    id: "wine-tasting",
    title: "Dégustation Vins Nature & Tapas",
    category: "tasting",
    categoryLabel: "Dégustation",
    date: "Samedi 8 Août 2026",
    time: "19:30 - 22:00",
    description: "Voyage œnologique à travers 5 domaines d'exception accompagnés de nos meilleures planches gourmandes.",
    image: "/images/orendezvous/orendezvous.tanger_1777049699_3882496730299010586_73557593345.jpg",
    status: "upcoming",
    statusLabel: "À venir",
    price: "450 MAD / pers.",
  },
  {
    id: "sunset-dj",
    title: "Sunset Lounge & Session Vinyl DJ Set",
    category: "music",
    categoryLabel: "Musique Live",
    date: "Vendredi 14 Août 2026",
    time: "18:00 - 01:00",
    description: "Ambiance terrasse chill, cocktails signature & sons deep house/funk pour célébrer le coucher du soleil.",
    image: "/images/orendezvous/orendezvous.tanger_1782412303_3927481512476698742_73557593345.jpg",
    status: "upcoming",
    statusLabel: "À venir",
    price: "Entrée libre",
  },
  {
    id: "chef-workshop",
    title: "Atelier Culinaire & Accord Mets-Vins",
    category: "theme",
    categoryLabel: "Atelier",
    date: "Dimanche 23 Août 2026",
    time: "11:30 - 15:00",
    description: "Le Chef partage ses secrets de cuisson et d'assaisonnement. Masterclass suivie d'un déjeuner dégustation.",
    image: "/images/orendezvous/orendezvous.tanger_1770820323_3830240942847468663_73557593345.jpg",
    status: "soldout",
    statusLabel: "Complet",
    price: "650 MAD / pers.",
  },
];

const PAST_PHOTOS = [
  "/images/orendezvous/orendezvous.tanger_1782412303_3927481511788834209_73557593345.jpg",
  "/images/orendezvous/orendezvous.tanger_1782412303_3927481512191507130_73557593345.jpg",
  "/images/orendezvous/orendezvous.tanger_1770308359_3825946276593598431_73557593345.jpg",
  "/images/orendezvous/orendezvous.tanger_1754585821_highlight18054770264426605.jpg",
];

export function EventsSection({
  slug,
  restaurantName,
  phone,
  whatsappNumber,
}: EventsSectionProps) {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [quoteData, setQuoteData] = useState({
    name: "",
    phone: "",
    eventType: "Anniversaire",
    guests: "20",
    date: "",
    notes: "",
  });

  const filteredEvents = EVENTS_DATA.filter(
    (e) => filter === "all" || e.category === filter
  );

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (whatsappNumber || phone) {
      const targetPhone = (whatsappNumber || phone || "").replace(/\D/g, "");
      const text = `*Demande de Privatisation / Devis*\n\nNom: ${quoteData.name}\nTéléphone: ${quoteData.phone}\nType d'événement: ${quoteData.eventType}\nNombre d'invités: ${quoteData.guests}\nDate souhaitée: ${quoteData.date || "Non spécifiée"}\nNotes: ${quoteData.notes || "Aucune"}`;
      window.open(
        `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
    setQuoteSubmitted(true);
    toast.success("Votre demande de devis a bien été envoyée !");
  };

  return (
    <div className="bg-[#fcf8f3] dark:bg-[#12100e] min-h-screen text-[#1a1715] dark:text-gray-100">
      {/* ── 1. Hero Banner ────────────────────────────────────────────────── */}
      <div className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#1f1510] to-[#12100e] text-white overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <Image
            src="/images/orendezvous/orendezvous.tanger_1782412303_3927481512476698742_73557593345.jpg"
            alt="Hero background"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1f1510]/80 via-[#1f1510]/95 to-[#12100e]" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center space-y-6">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-[#cd6133]/20 border border-[#cd6133]/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#f08556]">
            <Sparkles className="size-3.5" />
            ÉVÉNEMENTS &amp; SOIRÉES SPÉCIALES
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            Vivez des moments <br />
            <span className="italic font-normal text-[#cd6133]">inoubliables</span>
          </h1>

          <p className="max-w-2xl mx-auto text-gray-300 text-base sm:text-lg leading-relaxed">
            Musique live, dégustations exclusives, soirées à thème et privatisation d&apos;espaces. Découvrez le calendrier de {restaurantName}.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              asChild
              className="rounded-full bg-[#cd6133] hover:bg-[#b55026] text-white font-bold px-8 py-6 text-sm uppercase tracking-wider shadow-lg shadow-[#cd6133]/30"
            >
              <Link href={`/${slug}/reservation`}>Réserver une table</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border border-white/30 bg-white/5 text-white hover:bg-white/15 font-bold px-8 py-6 text-sm uppercase tracking-wider"
            >
              <a href="#privatisation">Privatiser le restaurant</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-24">
        {/* ── 2. Upcoming Events Grid ─────────────────────────────────────── */}
        <div className="space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="h-0.5 w-6 bg-[#cd6133]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#cd6133]">
                  PROGRAMME À VENIR
                </span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">
                Événements à ne pas manquer
              </h2>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: "all", label: "Tous" },
                { id: "music", label: "Musique Live" },
                { id: "tasting", label: "Dégustations" },
                { id: "theme", label: "Ateliers & Thèmes" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as CategoryFilter)}
                  className={`rounded-full px-5 py-2.5 text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                    filter === f.id
                      ? "bg-[#cd6133] border-[#cd6133] text-white shadow-md"
                      : "bg-white dark:bg-[#1c1917] border-[#e7e5e4] dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-[#f5f2ed] dark:hover:bg-white/5"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="group relative flex flex-col rounded-[2.5rem] bg-white dark:bg-[#1c1917] border border-[#e7e5e4] dark:border-white/10 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500"
              >
                {/* Poster Image */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-md ${
                        event.status === "soldout"
                          ? "bg-red-600"
                          : event.status === "tonight"
                          ? "bg-amber-500"
                          : "bg-[#cd6133]"
                      }`}
                    >
                      {event.statusLabel}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {event.categoryLabel}
                    </span>
                  </div>

                  {/* Price Badge */}
                  <div className="absolute bottom-4 right-4 text-xs font-extrabold bg-white/95 dark:bg-[#12100e]/90 text-[#1a1715] dark:text-white px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md">
                    {event.price}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-xs font-semibold text-[#cd6133]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-4" />
                        {event.date}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-4" />
                        {event.time}
                      </span>
                    </div>

                    <h3 className="font-display text-2xl font-bold text-[#1a1715] dark:text-white group-hover:text-[#cd6133] transition-colors">
                      {event.title}
                    </h3>

                    <p className="text-sm text-[#78716c] dark:text-gray-400 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#f5f2ed] dark:border-white/5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Places limitées</span>
                    <Button
                      asChild
                      disabled={event.status === "soldout"}
                      className={`rounded-full text-xs font-bold uppercase tracking-wider px-6 py-2.5 ${
                        event.status === "soldout"
                          ? "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed"
                          : "bg-[#cd6133] hover:bg-[#b55026] text-white shadow-md"
                      }`}
                    >
                      <Link href={`/${slug}/reservation`}>
                        {event.status === "soldout" ? "Liste d'attente" : "Réserver ma table"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Privatisation & Corporate Events ─────────────────────────── */}
        <div id="privatisation" className="space-y-12 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Offerings (5 cols) */}
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-0.5 w-6 bg-[#cd6133]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#cd6133]">
                    PRIVATISATION &amp; GROUPES
                  </span>
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold">
                  Organisez votre événement privé
                </h2>
                <p className="text-[#78716c] dark:text-gray-400 text-sm sm:text-base leading-relaxed">
                  Que ce soit pour un anniversaire, un repas d&apos;équipe ou la privatisation totale de notre espace, notre équipe vous accompagne sur-mesure.
                </p>
              </div>

              {/* Offerings list */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#1c1917] border border-[#e7e5e4] dark:border-white/10 shadow-sm flex items-start gap-4">
                  <div className="size-11 rounded-xl bg-[#f7e9e2] text-[#cd6133] dark:bg-[#2c1912] dark:text-[#f08556] flex items-center justify-center shrink-0">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[#1a1715] dark:text-white">Anniversaires &amp; Fêtes</h4>
                    <p className="text-xs text-[#78716c] dark:text-gray-400 mt-1 leading-relaxed">
                      Espace dédié, gâteaux personnalisés et ambiances festives pour célébrer avec vos proches.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#1c1917] border border-[#e7e5e4] dark:border-white/10 shadow-sm flex items-start gap-4">
                  <div className="size-11 rounded-xl bg-[#f7e9e2] text-[#cd6133] dark:bg-[#2c1912] dark:text-[#f08556] flex items-center justify-center shrink-0">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[#1a1715] dark:text-white">Événements d&apos;Entreprise</h4>
                    <p className="text-xs text-[#78716c] dark:text-gray-400 mt-1 leading-relaxed">
                      Cocktails dinatoires, réunions d&apos;équipe et repas de fin d&apos;année sur-mesure.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#1c1917] border border-[#e7e5e4] dark:border-white/10 shadow-sm flex items-start gap-4">
                  <div className="size-11 rounded-xl bg-[#f7e9e2] text-[#cd6133] dark:bg-[#2c1912] dark:text-[#f08556] flex items-center justify-center shrink-0">
                    <Wine className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[#1a1715] dark:text-white">Privatisation Totale</h4>
                    <p className="text-xs text-[#78716c] dark:text-gray-400 mt-1 leading-relaxed">
                      Accès exclusif à l&apos;ensemble de la salle et terrasse avec chef &amp; équipe dédiés.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form: Request a Quote (7 cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-[2.5rem] bg-white dark:bg-[#1c1917] p-6 sm:p-10 shadow-2xl border border-[#e7e5e4] dark:border-white/10">
                {quoteSubmitted ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <h3 className="font-display text-2xl font-bold">Demande de devis reçue !</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Merci ! Notre responsable événementiel va étudier votre demande et vous recontacter très rapidement.
                    </p>
                    <Button
                      onClick={() => setQuoteSubmitted(false)}
                      className="mt-4 rounded-full bg-[#cd6133] hover:bg-[#b55026] text-white px-6 py-2 text-xs uppercase font-bold"
                    >
                      Faire une autre demande
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleQuoteSubmit} className="space-y-5">
                    <div>
                      <h3 className="font-display text-2xl font-bold text-[#1a1715] dark:text-white">
                        Demander un devis sur-mesure
                      </h3>
                      <p className="text-xs sm:text-sm text-[#78716c] dark:text-gray-400 mt-1">
                        Remplissez le formulaire ci-dessous. Nous vous répondrons sous 24h.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                          Nom complet
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Votre nom et prénom"
                          value={quoteData.name}
                          onChange={(e) =>
                            setQuoteData({ ...quoteData, name: e.target.value })
                          }
                          className="w-full rounded-2xl bg-[#f5f2ed] dark:bg-[#262320] border-0 px-4 py-3 text-sm placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#cd6133]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                          Téléphone / WhatsApp
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="06 12 34 56 78"
                          value={quoteData.phone}
                          onChange={(e) =>
                            setQuoteData({ ...quoteData, phone: e.target.value })
                          }
                          className="w-full rounded-2xl bg-[#f5f2ed] dark:bg-[#262320] border-0 px-4 py-3 text-sm placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#cd6133]"
                        />
                      </div>
                    </div>

                    {/* Event Type Pills */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                        Type d&apos;événement
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["Anniversaire", "Entreprise", "Mariage / Fête", "Autre"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setQuoteData({ ...quoteData, eventType: t })}
                            className={`rounded-full px-4 py-2 text-xs font-bold transition-all border ${
                              quoteData.eventType === t
                                ? "bg-[#cd6133] border-[#cd6133] text-white shadow-sm"
                                : "bg-[#f5f2ed] dark:bg-[#262320] border-transparent text-[#5a544c] dark:text-gray-300 hover:bg-[#eae6de]"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                          Nombre d&apos;invités
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={200}
                          placeholder="Ex: 25"
                          value={quoteData.guests}
                          onChange={(e) =>
                            setQuoteData({ ...quoteData, guests: e.target.value })
                          }
                          className="w-full rounded-2xl bg-[#f5f2ed] dark:bg-[#262320] border-0 px-4 py-3 text-sm placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#cd6133]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                          Date souhaitée
                        </label>
                        <input
                          type="date"
                          value={quoteData.date}
                          onChange={(e) =>
                            setQuoteData({ ...quoteData, date: e.target.value })
                          }
                          className="w-full rounded-2xl bg-[#f5f2ed] dark:bg-[#262320] border-0 px-4 py-3 text-sm placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#cd6133]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                        Précisions / Demandes particulières
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Ambiance souhaitée, budget, restrictions alimentaires..."
                        value={quoteData.notes}
                        onChange={(e) =>
                          setQuoteData({ ...quoteData, notes: e.target.value })
                        }
                        className="w-full rounded-2xl bg-[#f5f2ed] dark:bg-[#262320] border-0 px-4 py-3 text-sm placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#cd6133] resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#cd6133] hover:bg-[#b55026] text-white font-bold text-xs uppercase tracking-wider py-6 shadow-lg shadow-[#cd6133]/25 transition-all duration-300"
                    >
                      <Send className="size-4 mr-2" />
                      Envoyer la demande de devis
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Past Events & Photo Gallery Grid ─────────────────────────── */}
        <div className="space-y-8 pt-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h3 className="font-display text-3xl font-bold">
              Revivez nos récents événements
            </h3>
            <p className="text-sm text-muted-foreground">
              Suivez-nous sur Instagram <span className="font-bold text-[#cd6133]">@rendezvous_tanger</span> pour découvrir nos prochains rendez-vous en direct.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PAST_PHOTOS.map((src, i) => (
              <div
                key={i}
                className="group relative h-64 sm:h-80 rounded-[2rem] overflow-hidden border border-[#e7e5e4] dark:border-white/10 shadow-lg"
              >
                <Image
                  src={src}
                  alt={`Événement passé ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-xs font-bold text-white tracking-wider uppercase">
                    @rendezvous_tanger
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
