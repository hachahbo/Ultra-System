"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { phoneSchema } from "@/lib/schemas";

const formSchema = z.object({
  customer_name: z.string().trim().min(1, "Nom requis").max(100),
  customer_phone: phoneSchema,
  date: z
    .string()
    .min(1, "Date requise")
    .refine(
      (d) => d >= format(new Date(), "yyyy-MM-dd"),
      "La date est déjà passée",
    ),
  time: z.string().min(1, "Heure requise"),
  party_size: z
    .number({ message: "Nombre invalide" })
    .int()
    .min(1, "Minimum 1 personne")
    .max(50, "Maximum 50"),
  note: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ReservationForm({ slug }: { slug: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "20:00",
      party_size: 2,
      note: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_slug: slug, ...values }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Une erreur est survenue. Réessayez.");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <CalendarCheck className="size-16 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-semibold">
          Demande envoyée !
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Le restaurant vous confirmera votre table très vite par téléphone ou
          WhatsApp.
        </p>
      </div>
    );
  }

  const errors = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-8 space-y-4"
      noValidate
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            aria-invalid={!!errors.date}
            {...form.register("date")}
          />
          <FieldError message={errors.date?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Heure *</Label>
          <Input
            id="time"
            type="time"
            aria-invalid={!!errors.time}
            {...form.register("time")}
          />
          <FieldError message={errors.time?.message} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="party_size">Nombre de personnes *</Label>
        <Input
          id="party_size"
          type="number"
          min={1}
          max={50}
          inputMode="numeric"
          aria-invalid={!!errors.party_size}
          {...form.register("party_size", { valueAsNumber: true })}
        />
        <FieldError message={errors.party_size?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer_name">Nom *</Label>
        <Input
          id="customer_name"
          autoComplete="name"
          aria-invalid={!!errors.customer_name}
          {...form.register("customer_name")}
        />
        <FieldError message={errors.customer_name?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer_phone">Téléphone *</Label>
        <Input
          id="customer_phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          aria-invalid={!!errors.customer_phone}
          {...form.register("customer_phone")}
        />
        <FieldError message={errors.customer_phone?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note (optionnel)</Label>
        <Textarea
          id="note"
          placeholder="Anniversaire, terrasse, chaise bébé…"
          {...form.register("note")}
        />
      </div>
      <Button size="lg" type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Envoi…" : "Demander la réservation"}
      </Button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
