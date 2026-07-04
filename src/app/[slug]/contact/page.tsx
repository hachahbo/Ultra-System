import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRestaurantBySlug } from "@/lib/menu";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const whatsappHref = restaurant.whatsapp_number
    ? `https://wa.me/${restaurant.whatsapp_number.replace(/\D/g, "")}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Contact
      </h1>

      <div className="mt-8 space-y-5">
        {restaurant.address && (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Adresse</p>
              <p className="text-sm text-muted-foreground">
                {restaurant.address}
              </p>
            </div>
          </div>
        )}
        {restaurant.hours && (
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Horaires</p>
              <p className="text-sm text-muted-foreground">
                {restaurant.hours}
              </p>
            </div>
          </div>
        )}
        {restaurant.phone && (
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Téléphone</p>
              <a
                href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                {restaurant.phone}
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {whatsappHref && (
          <Button asChild>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </Button>
        )}
        {restaurant.phone && (
          <Button asChild variant="outline">
            <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>
              <Phone className="size-4" /> Appeler
            </a>
          </Button>
        )}
      </div>

      {restaurant.address && (
        <div className="mt-10 overflow-hidden rounded-xl ring-1 ring-border">
          <iframe
            title={`Carte — ${restaurant.name}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(
              `${restaurant.name} ${restaurant.address}`,
            )}&output=embed`}
            className="h-72 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  );
}
