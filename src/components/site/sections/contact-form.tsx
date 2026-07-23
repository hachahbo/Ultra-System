"use client";

import { useState } from "react";
import { Clock, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContactFormProps {
  restaurantName: string;
  address?: string | null;
  hours?: string | null;
  phone?: string | null;
  mapUrl?: string | null;
  whatsappNumber?: string | null;
}

const SUBJECT_OPTIONS = [
  "Réservation",
  "Événement privé",
  "Commande",
  "Autre",
];

export function ContactFormSection({
  restaurantName,
  address,
  hours,
  phone,
  mapUrl,
  whatsappNumber,
}: ContactFormProps) {
  const [selectedSubject, setSelectedSubject] = useState("Réservation");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (whatsappNumber) {
      const text = `*Nouveau message de contact*\n\nNom: ${formData.firstName} ${formData.lastName}\nEmail: ${formData.email}\nSujet: ${selectedSubject}\nMessage: ${formData.message}`;
      window.open(
        `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
    setSubmitted(true);
  };

  return (
    <div className="bg-[#fcf8f3] dark:bg-[#12100e] min-h-screen text-[#1a1715] dark:text-gray-100 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-20">
        {/* Main Grid: Left Details & Right Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-0.5 w-6 bg-[#cd6133]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#cd6133]">
                  NOUS CONTACTER
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                Entrons en <br />
                <span className="italic font-normal text-[#cd6133]">contact</span>
              </h1>

              <p className="text-[#78716c] dark:text-gray-400 text-base sm:text-lg leading-relaxed pt-2">
                Une question, une envie de réserver une grande tablée, ou l’organisation d’un événement ? Notre équipe vous répond avec plaisir— en salle comme en cuisine.
              </p>
            </div>

            {/* Info List */}
            <div className="space-y-6 pt-4">
              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f7e9e2] text-[#cd6133] dark:bg-[#2c1912] dark:text-[#f08556]">
                  <MapPin className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#a8a29e] dark:text-gray-400">
                    ADRESSE
                  </p>
                  <p className="font-bold text-base text-[#1a1715] dark:text-white leading-snug">
                    {address ?? "Avenue Mohammed VI, Tanger"}
                  </p>
                  <p className="text-xs text-[#78716c] dark:text-gray-400">
                    Quartier Malabata · face à la corniche
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f7e9e2] text-[#cd6133] dark:bg-[#2c1912] dark:text-[#f08556]">
                  <Clock className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#a8a29e] dark:text-gray-400">
                    HORAIRES
                  </p>
                  <p className="font-bold text-base text-[#1a1715] dark:text-white leading-snug">
                    {hours ?? "Lun-Dim · 11h00 – 23h00"}
                  </p>
                  <p className="text-xs text-[#78716c] dark:text-gray-400">
                    Cuisine ouverte jusqu&apos;à 22h30
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f7e9e2] text-[#cd6133] dark:bg-[#2c1912] dark:text-[#f08556]">
                  <Phone className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#a8a29e] dark:text-gray-400">
                    TÉLÉPHONE
                  </p>
                  <a
                    href={phone ? `tel:${phone.replace(/\s/g, "")}` : "#"}
                    className="font-bold text-base text-[#1a1715] dark:text-white leading-snug hover:text-[#cd6133] transition-colors"
                  >
                    {phone ?? "+212 5 39 00 00 00"}
                  </a>
                  <p className="text-xs text-[#78716c] dark:text-gray-400">
                    Réservations &amp; commandes à emporter
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: White Card Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-[2.5rem] bg-white dark:bg-[#1c1917] p-8 sm:p-12 shadow-2xl border border-[#e7e5e4] dark:border-white/10">
              {submitted ? (
                <div className="py-16 text-center space-y-4">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-display text-2xl font-bold">Message envoyé avec succès !</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Merci pour votre message. Notre équipe va traiter votre demande et revenir vers vous rapidement.
                  </p>
                  <Button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 rounded-full bg-[#cd6133] hover:bg-[#b55026] text-white px-6 py-2 text-xs uppercase font-bold"
                  >
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h2 className="font-display text-3xl font-bold text-[#1a1715] dark:text-white">
                      Écrivez-nous
                    </h2>
                    <p className="text-sm text-[#78716c] dark:text-gray-400 mt-1">
                      Nous répondons généralement sous quelques heures.
                    </p>
                  </div>

                  {/* Name Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                        Prénom
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Votre prénom"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        className="w-full rounded-2xl bg-[#f5f2ed] dark:bg-[#262320] border-0 px-4 py-3.5 text-sm placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#cd6133]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                        Nom
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Votre nom"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="w-full rounded-2xl bg-[#f5f2ed] dark:bg-[#262320] border-0 px-4 py-3.5 text-sm placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#cd6133]"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="vous@exemple.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full rounded-2xl bg-[#f5f2ed] dark:bg-[#262320] border-0 px-4 py-3.5 text-sm placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#cd6133]"
                    />
                  </div>

                  {/* Sujet Pills */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                      Sujet
                    </label>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {SUBJECT_OPTIONS.map((subj) => {
                        const isSelected = selectedSubject === subj;
                        return (
                          <button
                            key={subj}
                            type="button"
                            onClick={() => setSelectedSubject(subj)}
                            className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                              isSelected
                                ? "bg-[#cd6133] text-white shadow-md"
                                : "bg-transparent border border-[#e7e5e4] dark:border-gray-700 text-[#44403c] dark:text-gray-300 hover:bg-[#f5f2ed] dark:hover:bg-[#262320]"
                            }`}
                          >
                            {subj}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1a1715] dark:text-gray-200">
                      Votre message
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Dites-nous comment nous pouvons vous aider..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="w-full rounded-2xl bg-[#f5f2ed] dark:bg-[#262320] border-0 px-4 py-3.5 text-sm placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#cd6133] resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full sm:w-auto rounded-full bg-[#cd6133] hover:bg-[#b55026] text-white font-bold text-xs uppercase tracking-wider py-6 px-10 shadow-lg shadow-[#cd6133]/25 transition-all duration-300"
                  >
                    <Send className="size-4 mr-2" />
                    Envoyer le message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Embedded Google Map Section */}
        {address && (
          <div className="overflow-hidden rounded-[2.5rem] border border-[#e7e5e4] dark:border-white/10 shadow-xl h-80 sm:h-96 relative">
            <iframe
              title={`Carte — ${restaurantName}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                `${restaurantName} ${address}`
              )}&output=embed`}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </div>
  );
}
