"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarClock,
  Mail,
  MessageCircle,
  PartyPopper,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EventForm } from "@/components/dashboard/event-form";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  INQUIRY_STATUS_LABELS,
  TIME_SLOT_LABELS,
} from "@/lib/events";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventInput } from "@/lib/schemas";
import type { EventInquiry, EventStatus, RestaurantEvent } from "@/lib/types";

async function fetchEvents(): Promise<RestaurantEvent[]> {
  const res = await fetch("/api/dashboard/events");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).events;
}

async function fetchInquiries(): Promise<EventInquiry[]> {
  const res = await fetch("/api/dashboard/events/inquiries");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).inquiries;
}

const STATUS_BADGE: Record<EventStatus, string> = {
  upcoming: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  sold_out: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  cancelled: "bg-destructive/12 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

const INQUIRY_BADGE: Record<EventInquiry["status"], string> = {
  pending: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  contacted: "bg-blue-500/12 text-blue-700 dark:text-blue-400",
  approved: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/12 text-destructive",
};

export function EventsView({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<RestaurantEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<RestaurantEvent | null>(null);

  const { data: events, isPending } = useQuery({
    queryKey: ["dashboard-events"],
    queryFn: fetchEvents,
    refetchInterval: 60_000,
  });
  const { data: inquiries } = useQuery({
    queryKey: ["event-inquiries"],
    queryFn: fetchInquiries,
    refetchInterval: 30_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });

  const save = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: EventInput }) => {
      const res = await fetch(id ? `/api/dashboard/events/${id}` : "/api/dashboard/events", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("save failed");
    },
    onSuccess: () => {
      refresh();
      setCreating(false);
      setEditing(null);
      toast.success("Événement enregistré");
    },
    onError: () => toast.error("Enregistrement impossible"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      refresh();
      setDeleting(null);
      toast.success("Événement supprimé");
    },
    onError: () => toast.error("Suppression impossible"),
  });

  const setInquiryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EventInquiry["status"] }) => {
      const res = await fetch(`/api/dashboard/events/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event-inquiries"] }),
    onError: () => toast.error("Mise à jour impossible"),
  });

  const pendingCount = useMemo(
    () => (inquiries ?? []).filter((q) => q.status === "pending").length,
    [inquiries],
  );

  const dialogOpen = creating || editing !== null;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-1 mt-2">
        <h1 className="font-display text-3xl font-bold text-foreground">Événements</h1>
        <p className="text-[13.5px] text-muted-foreground font-medium">
          Gérez vos soirées et vos demandes de privatisation.
        </p>
      </div>

      <Tabs defaultValue="events">
        <TabsList variant="line">
          <TabsTrigger value="events">Événements</TabsTrigger>
          <TabsTrigger value="inquiries">
            Demandes privées{pendingCount > 0 && ` (${pendingCount})`}
          </TabsTrigger>
        </TabsList>

        {/* ── Public events ─────────────────────────────────────────── */}
        <TabsContent value="events" className="mt-5">
          {canManage && (
            <div className="mb-5 flex justify-end">
              <Button
                onClick={() => setCreating(true)}
                className="rounded-full bg-primary px-6 py-5 font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                <Plus className="size-4" /> Nouvel événement
              </Button>
            </div>
          )}

          {isPending ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : (events?.length ?? 0) === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="Aucun événement"
              hint="Créez votre première soirée pour l'afficher sur votre site."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events!.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="relative aspect-[16/9] w-full bg-muted">
                    {e.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.cover_image} alt={e.title} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground/40">
                        <PartyPopper className="size-9" />
                      </div>
                    )}
                    <span
                      className={cn(
                        "absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                        STATUS_BADGE[e.status],
                      )}
                    >
                      {EVENT_STATUS_LABELS[e.status]}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                      {EVENT_CATEGORY_LABELS[e.category]}
                    </span>
                    <h3 className="mt-1 text-[15px] font-extrabold text-foreground">{e.title}</h3>
                    {e.tagline && (
                      <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted-foreground">{e.tagline}</p>
                    )}
                    <div className="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                      <CalendarClock className="size-3.5" />
                      {format(parseISO(e.start_date), "EEE d MMM · HH'h'mm", { locale: fr })}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                      {e.max_seats != null && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" /> {e.reserved_seats}/{e.max_seats}
                        </span>
                      )}
                      {e.minimum_spend_per_person > 0 && (
                        <span>Min. {formatPrice(e.minimum_spend_per_person, e.currency)}</span>
                      )}
                      {!e.is_free_entry && e.ticket_price > 0 && (
                        <span>Billet {formatPrice(e.ticket_price, e.currency)}</span>
                      )}
                    </div>

                    {canManage && (
                      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-lg font-semibold"
                          onClick={() => setEditing(e)}
                        >
                          <Pencil className="size-3.5" /> Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Supprimer"
                          className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleting(e)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Private inquiries ─────────────────────────────────────── */}
        <TabsContent value="inquiries" className="mt-5">
          {(inquiries?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Mail}
              title="Aucune demande"
              hint="Les demandes de privatisation soumises depuis votre site apparaîtront ici."
            />
          ) : (
            <div className="space-y-3">
              {inquiries!.map((q) => (
                <Card key={q.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-extrabold text-foreground">{q.full_name}</span>
                          <Badge variant="outline" className="rounded-full font-bold">
                            {EVENT_TYPE_LABELS[q.event_type]}
                          </Badge>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                              INQUIRY_BADGE[q.status],
                            )}
                          >
                            {INQUIRY_STATUS_LABELS[q.status]}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" /> {q.guest_count} pers.
                          </span>
                          {q.preferred_date && (
                            <span className="flex items-center gap-1">
                              <CalendarClock className="size-3.5" />
                              {format(parseISO(q.preferred_date), "d MMM yyyy", { locale: fr })}
                              {q.preferred_time_slot && ` · ${TIME_SLOT_LABELS[q.preferred_time_slot]}`}
                            </span>
                          )}
                          {q.budget_estimated_mad != null && (
                            <span>Budget ~ {formatPrice(q.budget_estimated_mad)}</span>
                          )}
                        </div>
                        {q.special_requests && (
                          <p className="mt-2 text-[13px] italic text-muted-foreground">« {q.special_requests} »</p>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                          <a
                            href={`tel:${q.phone}`}
                            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline"
                          >
                            <Phone className="size-3.5" /> {q.phone}
                          </a>
                          <a
                            href={`https://wa.me/${q.phone.replace(/\D/g, "").replace(/^0/, "212")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline"
                          >
                            <MessageCircle className="size-3.5" /> WhatsApp
                          </a>
                          {q.email && (
                            <a
                              href={`mailto:${q.email}`}
                              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline"
                            >
                              <Mail className="size-3.5" /> {q.email}
                            </a>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="shrink-0">
                          <Select
                            value={q.status}
                            onValueChange={(v) =>
                              setInquiryStatus.mutate({ id: q.id, status: v as EventInquiry["status"] })
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(INQUIRY_STATUS_LABELS) as EventInquiry["status"][]).map((s) => (
                                <SelectItem key={s} value={s}>
                                  {INQUIRY_STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && (setCreating(false), setEditing(null))}>
        <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden rounded-3xl border-none p-0 ring-1 ring-border/60 sm:max-w-lg">
          <EventForm
            event={editing ?? undefined}
            saving={save.isPending}
            onSubmit={(values) => save.mutate({ id: editing?.id, values })}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl border-border bg-card shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">
              Supprimer « {deleting?.title} » ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-muted-foreground">
              Cet événement sera retiré de votre site publiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold hover:bg-muted">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive font-bold text-white hover:bg-destructive/90"
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
