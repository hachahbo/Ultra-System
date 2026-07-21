"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Minus, Plus, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { phoneSchema } from "@/lib/schemas";
import type { Restaurant } from "@/lib/types";

const deliveryFormSchema = z.object({
  customer_name: z.string().trim().min(1, "Nom requis").max(100),
  customer_phone: phoneSchema,
  address: z.string().trim().min(5, "Adresse requise").max(300),
  note: z.string().trim().max(500).optional(),
});

type DeliveryForm = z.infer<typeof deliveryFormSchema>;

export function CheckoutClient({ restaurant }: { restaurant: Restaurant }) {
  const { lines, table, increment, decrement, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const isDineIn = Boolean(table);
  const subtotal = cartSubtotal(lines);
  const deliveryFee = isDineIn ? 0 : Number(restaurant.base_delivery_fee);
  const total = subtotal + deliveryFee;

  const form = useForm<DeliveryForm>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: { customer_name: "", customer_phone: "", address: "", note: "" },
  });

  async function submitOrder(delivery?: DeliveryForm) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: restaurant.slug,
          type: isDineIn ? "dine_in" : "delivery",
          table_number: table ?? undefined,
          customer_name: delivery?.customer_name,
          customer_phone: delivery?.customer_phone,
          address: delivery?.address,
          note: (delivery?.note || note) || undefined,
          lines: lines.map((l) => ({
            item_id: l.item_id,
            quantity: l.quantity,
            options: l.options,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Une erreur est survenue. Réessayez.");
        return;
      }
      setOrderId(data.id);
      clear();
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderId) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <CheckCircle2 className="size-16 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-semibold">
          Commande envoyée !
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {isDineIn
            ? "Votre commande est en cuisine. Elle arrive à votre table."
            : "Le restaurant prépare votre commande. Paiement à la livraison, en espèces."}
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href={`/${restaurant.slug}/menu`}>Retour au menu</Link>
        </Button>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Votre panier est vide.</p>
        <Button asChild className="mt-6">
          <Link href={`/${restaurant.slug}/menu`}>Voir le menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8 pb-24">
      {isDineIn && (
        <p className="rounded-2xl bg-primary/10 text-primary px-6 py-4 text-sm font-medium border border-primary/20">
          Commande sur place — <strong>table {table}</strong>. Aucune coordonnée requise.
        </p>
      )}

      {/* Lines */}
      <ul className="space-y-4">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-4 rounded-[24px] bg-card/50 p-4 shadow-sm ring-1 ring-border/50 transition-all hover:shadow-md">
            <div className="relative size-20 shrink-0 rounded-2xl overflow-hidden bg-muted/50 border border-border/50">
              {l.image_url ? (
                <Image
                  src={l.image_url}
                  alt={l.name}
                  fill
                  sizes="80px"
                  className="object-contain drop-shadow-sm p-1"
                />
              ) : (
                <div className="grid size-full place-items-center">
                  <UtensilsCrossed className="size-6 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-base">{l.name}</p>
              {l.options.length > 0 && (
                <p className="line-clamp-2 text-xs text-muted-foreground mt-1">
                  {l.options.join(" · ")}
                </p>
              )}
              <p className="mt-2 text-sm font-black text-[#FF6B35]">
                {formatPrice(l.unit_price * l.quantity, restaurant.currency)}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1 ring-1 ring-border/50">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full hover:bg-background hover:shadow-sm"
                aria-label={`Retirer un ${l.name}`}
                onClick={() => decrement(l.key)}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-6 text-center text-sm font-bold tabular-nums">
                {l.quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full hover:bg-background hover:shadow-sm"
                aria-label={`Ajouter un ${l.name}`}
                onClick={() => increment(l.key)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* Totals */}
      <div className="rounded-[24px] bg-card p-6 ring-1 ring-border/50 space-y-3 shadow-sm">
        <div className="flex justify-between text-muted-foreground font-medium">
          <span>Sous-total</span>
          <span>{formatPrice(subtotal, restaurant.currency)}</span>
        </div>
        {!isDineIn && (
          <div className="flex justify-between text-muted-foreground font-medium">
            <span>Livraison</span>
            <span>{formatPrice(deliveryFee, restaurant.currency)}</span>
          </div>
        )}
        <Separator className="my-3 opacity-50" />
        <div className="flex justify-between text-xl font-black">
          <span>Total</span>
          <span className="text-[#FF6B35]">{formatPrice(total, restaurant.currency)}</span>
        </div>
        {!isDineIn && (
          <p className="pt-2 text-xs font-medium text-muted-foreground">
            Paiement à la livraison, en espèces.
          </p>
        )}
      </div>

      {isDineIn ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="dine-note" className="text-base font-semibold">Note pour la cuisine (optionnel)</Label>
            <Textarea
              id="dine-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Sans oignons, bien cuit…"
              className="min-h-[120px] rounded-2xl bg-muted/30 px-4 py-3 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent transition-all"
            />
          </div>
          <Button
            size="lg"
            className="w-full rounded-full h-14 text-lg font-bold shadow-xl"
            disabled={submitting}
            onClick={() => submitOrder()}
          >
            {submitting ? "Envoi…" : "Envoyer en cuisine"}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit((values) => submitOrder(values))}
          className="space-y-6"
          noValidate
        >
          <div className="space-y-3">
            <Label htmlFor="customer_name" className="text-sm font-semibold text-muted-foreground ml-1">Nom *</Label>
            <Input
              id="customer_name"
              autoComplete="name"
              aria-invalid={!!form.formState.errors.customer_name}
              {...form.register("customer_name")}
              className="h-14 rounded-2xl bg-muted/30 px-4 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent transition-all"
            />
            <FieldError message={form.formState.errors.customer_name?.message} />
          </div>
          <div className="space-y-3">
            <Label htmlFor="customer_phone" className="text-sm font-semibold text-muted-foreground ml-1">Téléphone *</Label>
            <Input
              id="customer_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="06 12 34 56 78"
              aria-invalid={!!form.formState.errors.customer_phone}
              {...form.register("customer_phone")}
              className="h-14 rounded-2xl bg-muted/30 px-4 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent transition-all"
            />
            <FieldError
              message={form.formState.errors.customer_phone?.message}
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="address" className="text-sm font-semibold text-muted-foreground ml-1">Adresse de livraison *</Label>
            <Textarea
              id="address"
              autoComplete="street-address"
              placeholder="Rue, immeuble, étage, quartier…"
              aria-invalid={!!form.formState.errors.address}
              {...form.register("address")}
              className="min-h-[100px] rounded-2xl bg-muted/30 px-4 py-3 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent transition-all"
            />
            <FieldError message={form.formState.errors.address?.message} />
          </div>
          <div className="space-y-3">
            <Label htmlFor="note" className="text-sm font-semibold text-muted-foreground ml-1">Note (optionnel)</Label>
            <Textarea 
              id="note" 
              {...form.register("note")} 
              className="min-h-[100px] rounded-2xl bg-muted/30 px-4 py-3 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent transition-all"
            />
          </div>
          
          <div className="pt-4">
            <Button size="lg" className="w-full rounded-full h-14 text-lg font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]" type="submit" disabled={submitting}>
              {submitting
                ? "Envoi…"
                : `Commander · ${formatPrice(total, restaurant.currency)}`}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
