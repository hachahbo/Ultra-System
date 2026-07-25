"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventSchema, type EventFormInput, type EventInput } from "@/lib/schemas";
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from "@/lib/events";
import type { EventCategory, EventStatus, RestaurantEvent } from "@/lib/types";

// timestamptz ↔ <input type="datetime-local"> (which has no timezone).
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

const LABEL = "text-[12px] font-bold uppercase tracking-wider text-muted-foreground";
const FIELD = "border-border bg-background h-11 rounded-xl shadow-sm text-[14px] font-medium";

export function EventForm({
  event,
  saving,
  onSubmit,
  onCancel,
}: {
  event?: RestaurantEvent;
  saving: boolean;
  onSubmit: (values: EventInput) => void;
  onCancel: () => void;
}) {
  const form = useForm<EventFormInput, unknown, EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title ?? "",
      tagline: event?.tagline ?? "",
      description: event?.description ?? "",
      category: event?.category ?? "live_music",
      status: event?.status ?? "upcoming",
      cover_image: event?.cover_image ?? "",
      badge_label: event?.badge_label ?? "",
      start_date: toLocalInput(event?.start_date),
      end_date: toLocalInput(event?.end_date),
      doors_open: event?.doors_open ?? "",
      is_free_entry: event?.is_free_entry ?? true,
      ticket_price: event?.ticket_price ?? 0,
      currency: event?.currency ?? "MAD",
      minimum_spend_per_person: event?.minimum_spend_per_person ?? 0,
      max_seats: event?.max_seats ?? undefined,
      reserved_seats: event?.reserved_seats ?? 0,
    },
  });
  const errors = form.formState.errors;
  const isFree = form.watch("is_free_entry");

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-border/50 px-6 pt-6 pb-4">
        <DialogTitle className="font-display text-xl font-bold tracking-tight">
          {event ? "Modifier l'événement" : "Nouvel événement"}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden" noValidate>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="ev-title" className={LABEL}>Titre</Label>
            <Input id="ev-title" className={FIELD} placeholder="Soirée Jazz Live…" {...form.register("title")} />
            {errors.title && <p className="text-[13px] font-medium text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-tagline" className={LABEL}>Accroche</Label>
            <Input id="ev-tagline" className={FIELD} placeholder="Une ambiance feutrée…" {...form.register("tagline")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-desc" className={LABEL}>Description</Label>
            <Textarea id="ev-desc" rows={3} className="rounded-xl bg-background text-[14px]" {...form.register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={LABEL}>Catégorie</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) => form.setValue("category", v as EventCategory)}
              >
                <SelectTrigger className={FIELD}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{EVENT_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={LABEL}>Statut</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as EventStatus)}
              >
                <SelectTrigger className={FIELD}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{EVENT_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ev-start" className={LABEL}>Début</Label>
              <Input id="ev-start" type="datetime-local" className={FIELD} {...form.register("start_date")} />
              {errors.start_date && <p className="text-[13px] font-medium text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-end" className={LABEL}>Fin</Label>
              <Input id="ev-end" type="datetime-local" className={FIELD} {...form.register("end_date")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ev-doors" className={LABEL}>Ouverture des portes</Label>
              <Input id="ev-doors" type="time" className={FIELD} {...form.register("doors_open")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-badge" className={LABEL}>Badge (optionnel)</Label>
              <Input id="ev-badge" className={FIELD} placeholder="Ce Vendredi" {...form.register("badge_label")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-cover" className={LABEL}>Image de couverture (URL)</Label>
            <Input id="ev-cover" className={FIELD} placeholder="https://…" {...form.register("cover_image")} />
            {errors.cover_image && <p className="text-[13px] font-medium text-destructive">{errors.cover_image.message}</p>}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-[13.5px] font-bold text-foreground">Entrée gratuite</p>
              <p className="text-[12px] text-muted-foreground">Entrée libre avec réservation de table</p>
            </div>
            <Switch
              checked={isFree}
              onCheckedChange={(v) => form.setValue("is_free_entry", v)}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!isFree && (
              <div className="space-y-2">
                <Label htmlFor="ev-ticket" className={LABEL}>Prix du billet (MAD)</Label>
                <Input id="ev-ticket" type="number" min={0} className={FIELD} {...form.register("ticket_price")} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ev-min" className={LABEL}>Min. par personne (MAD)</Label>
              <Input id="ev-min" type="number" min={0} className={FIELD} {...form.register("minimum_spend_per_person")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ev-max" className={LABEL}>Places max</Label>
              <Input id="ev-max" type="number" min={0} className={FIELD} placeholder="50" {...form.register("max_seats")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-reserved" className={LABEL}>Places réservées</Label>
              <Input id="ev-reserved" type="number" min={0} className={FIELD} {...form.register("reserved_seats")} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-border/40 bg-card/95 px-6 pb-6 pt-4 backdrop-blur-md">
          <Button type="button" variant="ghost" className="rounded-full font-bold hover:bg-muted" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="submit"
            className="rounded-full bg-primary px-6 font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            disabled={saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </>
  );
}
