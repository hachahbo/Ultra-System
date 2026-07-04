"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Minus, Plus } from "lucide-react";
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
    <div className="mt-6 space-y-6">
      {isDineIn && (
        <p className="rounded-lg bg-accent px-4 py-3 text-sm">
          Commande sur place — <strong>table {table}</strong>. Aucune
          coordonnée requise.
        </p>
      )}

      {/* Lines */}
      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-border/60">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{l.name}</p>
              {l.options.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  {l.options.join(" · ")}
                </p>
              )}
              <p className="mt-0.5 text-sm font-semibold text-primary">
                {formatPrice(l.unit_price * l.quantity, restaurant.currency)}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Retirer un ${l.name}`}
                onClick={() => decrement(l.key)}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-7 text-center text-sm font-medium">
                {l.quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
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
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sous-total</span>
          <span>{formatPrice(subtotal, restaurant.currency)}</span>
        </div>
        {!isDineIn && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Livraison</span>
            <span>{formatPrice(deliveryFee, restaurant.currency)}</span>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatPrice(total, restaurant.currency)}</span>
        </div>
        {!isDineIn && (
          <p className="pt-1 text-xs text-muted-foreground">
            Paiement à la livraison, en espèces.
          </p>
        )}
      </div>

      {isDineIn ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dine-note">Note pour la cuisine (optionnel)</Label>
            <Textarea
              id="dine-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Sans oignons, bien cuit…"
            />
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={submitting}
            onClick={() => submitOrder()}
          >
            {submitting ? "Envoi…" : "Envoyer en cuisine"}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit((values) => submitOrder(values))}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="customer_name">Nom *</Label>
            <Input
              id="customer_name"
              autoComplete="name"
              aria-invalid={!!form.formState.errors.customer_name}
              {...form.register("customer_name")}
            />
            <FieldError message={form.formState.errors.customer_name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_phone">Téléphone *</Label>
            <Input
              id="customer_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="06 12 34 56 78"
              aria-invalid={!!form.formState.errors.customer_phone}
              {...form.register("customer_phone")}
            />
            <FieldError
              message={form.formState.errors.customer_phone?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse de livraison *</Label>
            <Textarea
              id="address"
              autoComplete="street-address"
              placeholder="Rue, immeuble, étage, quartier…"
              aria-invalid={!!form.formState.errors.address}
              {...form.register("address")}
            />
            <FieldError message={form.formState.errors.address?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optionnel)</Label>
            <Textarea id="note" {...form.register("note")} />
          </div>
          <Button size="lg" className="w-full" type="submit" disabled={submitting}>
            {submitting
              ? "Envoi…"
              : `Commander · ${formatPrice(total, restaurant.currency)}`}
          </Button>
        </form>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
