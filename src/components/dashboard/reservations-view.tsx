"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { dateFnsLocale } from "@/lib/date-locale";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Check,
  LayoutGrid,
  List,
  MapPin,
  MessageCircle,
  Users,
  X,
  Phone,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Info,
  Plus,
  User,
  Hash,
  Minus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FloorPlanMap, type TableStatus } from "@/components/dashboard/floor-plan";
import { fetchTables, tablesQueryKey } from "@/lib/tables-query";
import { dayBucket } from "@/lib/time";
import { isTableReserved } from "@/lib/reservations";
import type { DiningTable, Reservation } from "@/lib/types";

const SLOT_OPTIONS = Array.from({ length: 26 }, (_, i) => {
  const totalMinutes = 11 * 60 + i * 30; // 11:00 .. 23:30
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

async function fetchReservations(): Promise<Reservation[]> {
  const res = await fetch("/api/dashboard/reservations");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).reservations;
}

type DayFilter = "today" | "upcoming" | "past";

export function ReservationsView() {
  const locale = useLocale();
  const t = useTranslations("Reservations");
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "map">("list");
  const [dayFilter, setDayFilter] = useState<DayFilter>("upcoming");
  const [mapDate, setMapDate] = useState(() => dayBucket(new Date()));
  const [mapTime, setMapTime] = useState("12:00");
  const [assigning, setAssigning] = useState<Reservation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New reservation form state
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newDate, setNewDate] = useState(() => dayBucket(new Date()));
  const [newTime, setNewTime] = useState("19:00");
  const [newPartySize, setNewPartySize] = useState(2);
  const [newTableNumber, setNewTableNumber] = useState<string>("none");
  const [newNote, setNewNote] = useState("");
  const [newStatus, setNewStatus] = useState<"confirmed" | "new" | "declined">("confirmed");

  const resetNewForm = () => {
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewDate(dayBucket(new Date()));
    setNewTime("19:00");
    setNewPartySize(2);
    setNewTableNumber("none");
    setNewNote("");
    setNewStatus("confirmed");
  };

  const createReservationMutation = useMutation({
    mutationFn: async (payload: {
      customer_name: string;
      customer_phone: string;
      date: string;
      time: string;
      party_size: number;
      note?: string | null;
      assigned_table_number?: string | null;
      status: "confirmed" | "new" | "declined";
    }) => {
      const res = await fetch("/api/dashboard/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Échec de création de la réservation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Réservation ajoutée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setIsCreateModalOpen(false);
      resetNewForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Impossible d'ajouter la réservation");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      toast.error("Le nom du client est requis.");
      return;
    }
    if (!newCustomerPhone.trim()) {
      toast.error("Le téléphone est requis.");
      return;
    }
    createReservationMutation.mutate({
      customer_name: newCustomerName.trim(),
      customer_phone: newCustomerPhone.trim(),
      date: newDate,
      time: newTime,
      party_size: Number(newPartySize) || 1,
      note: newNote.trim() || null,
      assigned_table_number: newTableNumber === "none" ? null : newTableNumber,
      status: newStatus,
    });
  };

  const { data: reservations, isPending } = useQuery({
    queryKey: ["reservations"],
    queryFn: fetchReservations,
    refetchInterval: 30_000,
  });
  const { data: tables } = useQuery({ queryKey: tablesQueryKey, queryFn: fetchTables });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Reservation["status"] }) => {
      const res = await fetch(`/api/dashboard/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reservations"] }),
    onError: () => toast.error(t("updateFailed")),
  });

  const assignTable = useMutation({
    mutationFn: async ({
      id,
      assigned_table_number,
    }: {
      id: string;
      assigned_table_number: string | null;
    }) => {
      const res = await fetch(`/api/dashboard/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_table_number }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setAssigning(null);
    },
    onError: () => toast.error(t("assignFailed")),
  });

  const todayCasa = dayBucket(new Date());
  const dayFiltered = (reservations ?? []).filter((r) => {
    if (dayFilter === "today") return r.date === todayCasa;
    if (dayFilter === "upcoming") return r.date >= todayCasa;
    return r.date < todayCasa;
  });
  const pending = dayFiltered.filter((r) => r.status === "new");
  const decided = dayFiltered.filter((r) => r.status !== "new");

  function mapTableStatus(table: DiningTable): TableStatus {
    return isTableReserved(table, reservations ?? [], mapDate, mapTime)
      ? "reserved"
      : "free";
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-full font-extrabold text-xs gap-1.5 px-4 h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="size-4 stroke-[2.5]" />
            Nouvelle réservation
          </Button>
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={t("listView")}
              onClick={() => setView("list")}
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={view === "map" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={t("floorView")}
              onClick={() => setView("map")}
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-4">
          <div className="mb-3 flex gap-2">
            <Input
              type="date"
              value={mapDate}
              onChange={(e) => setMapDate(e.target.value)}
              className="w-auto"
            />
            <Select value={mapTime} onValueChange={setMapTime}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            {t("floorHint")}
          </p>
          <FloorPlanMap
            tables={tables ?? []}
            mode="view"
            getStatus={mapTableStatus}
            onTableTap={(t) => {
              const reservation = (reservations ?? []).find(
                (r) =>
                  r.assigned_table_number === t.number &&
                  isTableReserved(t, reservations ?? [], mapDate, mapTime),
              );
              toast.message(
                reservation
                  ? `Table ${t.number} — ${reservation.customer_name} (${reservation.time.slice(0, 5)})`
                  : `Table ${t.number} — libre à ce créneau`,
              );
            }}
          />
        </div>
      ) : (
        <>
          <Tabs value={dayFilter} onValueChange={(v) => setDayFilter(v as DayFilter)} className="mt-4">
            <TabsList variant="line">
              <TabsTrigger value="today">Aujourd&apos;hui</TabsTrigger>
              <TabsTrigger value="upcoming">{t("upcoming")}</TabsTrigger>
              <TabsTrigger value="past">{t("past")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <section className="mt-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              À confirmer{pending.length > 0 && ` (${pending.length})`}
            </h2>
            <div className="mt-2 space-y-3">
              {isPending && (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-xl" aria-busy="true" />
                  <Skeleton className="h-24 w-full rounded-xl" aria-busy="true" />
                </div>
              )}
              {!isPending && pending.length === 0 && (
                <EmptyState
                  icon={CalendarDays}
                  title={t("empty")}
                  hint={t("emptyHint")}
                />
              )}
              {pending.map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  onAssign={() => setAssigning(r)}
                >
                  <Button
                    size="sm"
                    className="w-full py-4 sm:w-36 justify-center rounded-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setStatus.mutate({ id: r.id, status: "confirmed" })}
                    disabled={setStatus.isPending}
                  >
                    Confirmer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full py-4 sm:w-36 justify-center rounded-full font-bold border-border hover:bg-muted"
                    onClick={() => setStatus.mutate({ id: r.id, status: "declined" })}
                    disabled={setStatus.isPending}
                  >
                    Refuser
                  </Button>
                </ReservationCard>
              ))}
            </div>
          </section>

          {decided.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-muted-foreground">{t("title")}</h2>
              <div className="mt-2 space-y-3">
                {decided.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    onAssign={r.status === "confirmed" ? () => setAssigning(r) : undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Reservation Details & Table Assignment Modal */}
      <Dialog open={assigning !== null} onOpenChange={(open) => !open && setAssigning(null)}>
        <DialogContent className="max-w-3xl sm:max-w-3xl lg:max-w-4xl rounded-[28px] p-5 sm:p-7 max-h-[90vh] flex flex-col min-h-0 bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl space-y-4">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center justify-between font-display border-b border-border/60 pb-4 pr-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 sm:size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-orange-500/10 to-transparent text-primary border border-primary/30 shadow-inner shrink-0">
                  <CalendarDays className="size-5 sm:size-6 stroke-[2.25]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-foreground leading-tight">
                    Réservation — {assigning?.customer_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3.5 text-primary/70" />
                      {assigning && format(parseISO(assigning.date), "EEEE d MMMM", { locale: dateFnsLocale(locale) })} à {assigning?.time.slice(0, 5)}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                      <Users className="size-3" />
                      {assigning?.party_size} personne{(assigning?.party_size || 0) > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
              {assigning && <StatusBadge status={assigning.status} />}
            </DialogTitle>
          </DialogHeader>

          {assigning && (
            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 py-1 pr-1">
              {/* Left Column: Guest info, Contact, Notes & Status Actions */}
              <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* Guest Contact Box */}
                  <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Contact Client
                    </span>
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Phone className="size-4 text-primary shrink-0" />
                        {assigning.customer_phone}
                      </span>
                      <a
                        href={`https://wa.me/${assigning.customer_phone.replace(/\D/g, "").replace(/^0/, "212")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20 transition-colors shrink-0 shadow-2xs"
                      >
                        <MessageCircle className="size-3.5" /> WhatsApp
                      </a>
                    </div>
                  </div>

                  {/* Special Note */}
                  {assigning.note && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        <FileText className="size-3.5" /> Note de réservation
                      </div>
                      <p className="text-xs font-medium text-foreground italic leading-relaxed">
                        « {assigning.note} »
                      </p>
                    </div>
                  )}

                  {/* Table Status Chip */}
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary shrink-0" />
                      <span className="text-xs font-extrabold text-foreground">
                        {assigning.assigned_table_number
                          ? `Table ${assigning.assigned_table_number} assignée`
                          : "Aucune table assignée"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Actions */}
                <div className="space-y-2 pt-2">
                  <span className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Action rapide
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 py-2.5 rounded-xl font-extrabold text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      onClick={() => {
                        setStatus.mutate({ id: assigning.id, status: "confirmed" });
                        setAssigning(null);
                      }}
                      disabled={setStatus.isPending}
                    >
                      <CheckCircle2 className="size-4" /> Confirmer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 py-2.5 rounded-xl font-extrabold text-xs gap-1.5 border-border hover:bg-muted"
                      onClick={() => {
                        setStatus.mutate({ id: assigning.id, status: "declined" });
                        setAssigning(null);
                      }}
                      disabled={setStatus.isPending}
                    >
                      <XCircle className="size-4" /> Refuser
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Floor Plan Map */}
              <div className="md:col-span-7 space-y-2.5 flex flex-col">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" /> Plan des tables
                  </span>
                  <div className="flex items-center gap-2.5 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-500" /> Libre
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <span className="size-2 rounded-full bg-primary" /> Assignée
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <span className="size-2 rounded-full bg-muted-foreground/50" /> Occupée
                    </span>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border/70 rounded-2xl p-2 min-h-[300px] flex flex-col justify-center shadow-inner">
                  <FloorPlanMap
                    tables={tables ?? []}
                    mode="view"
                    getStatus={(t) => {
                      if (t.number === assigning.assigned_table_number) return "selected";
                      return isTableReserved(t, reservations ?? [], assigning.date, assigning.time.slice(0, 5))
                        ? "reserved"
                        : "free";
                    }}
                    onTableTap={(t) => {
                      const alreadyAssigned = t.number === assigning.assigned_table_number;
                      assignTable.mutate({
                        id: assigning.id,
                        assigned_table_number: alreadyAssigned ? null : t.number,
                      });
                    }}
                  />
                </div>

                <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mt-1">
                  <Info className="size-3 text-primary shrink-0" />
                  Touchez une table libre pour l&apos;assigner. Touchez à nouveau pour la retirer.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Reservation Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && setIsCreateModalOpen(false)}>
        <DialogContent className="max-w-3xl sm:max-w-3xl lg:max-w-4xl rounded-[28px] p-5 sm:p-7 max-h-[90vh] flex flex-col min-h-0 bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl space-y-5 overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-3.5 font-display border-b border-border/60 pb-4 pr-6">
              <div className="flex size-11 sm:size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 via-orange-500/15 to-primary/5 text-primary border border-primary/30 shadow-inner shrink-0">
                <Plus className="size-5 sm:size-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-foreground leading-tight">
                  Nouvelle réservation
                </h3>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Ajouter une réservation manuellement dans votre calendrier.
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 min-h-0 space-y-4 py-1">
            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 pr-1">
              {/* Left Column: Customer Info, Notes & Initial Status */}
              <div className="md:col-span-6 space-y-4 flex flex-col justify-between">
                <div className="bg-muted/30 dark:bg-muted/20 border border-border/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                    <User className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                      Informations du client
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Nom du client */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-customer-name" className="text-xs font-bold text-foreground/80">
                        Nom du client *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="new-customer-name"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          placeholder="Ex: Famille Bennani"
                          required
                          className="pl-9.5 rounded-xl text-xs font-bold bg-background/80 border-border/70 focus-visible:ring-2 focus-visible:ring-primary/30 h-10 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-customer-phone" className="text-xs font-bold text-foreground/80">
                        Téléphone *
                      </Label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 flex items-center gap-1 text-xs font-extrabold text-muted-foreground select-none pointer-events-none">
                          <Phone className="size-3.5 text-primary shrink-0" />
                          <span className="text-[11px] font-semibold text-muted-foreground/80">🇲🇦</span>
                        </span>
                        <Input
                          id="new-customer-phone"
                          value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                          placeholder="0661234567"
                          required
                          className="pl-16 rounded-xl text-xs font-bold bg-background/80 border-border/70 focus-visible:ring-2 focus-visible:ring-primary/30 h-10 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Note / Demande spéciale */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-note" className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                        <FileText className="size-3.5 text-primary" /> Note / Demande spéciale
                      </Label>
                      <Textarea
                        id="new-note"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Ex: Près de la fenêtre, chaise bébé, anniversaire..."
                        className="rounded-xl text-xs font-medium bg-background/80 border-border/70 focus-visible:ring-2 focus-visible:ring-primary/30 min-h-[76px] p-3 resize-none shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Initial Status */}
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/90">
                      Statut initial
                    </Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setNewStatus("confirmed")}
                        className={cn(
                          "relative p-3 rounded-2xl border transition-all duration-200 flex flex-col items-start gap-1 cursor-pointer text-left shadow-2xs",
                          newStatus === "confirmed"
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                            : "border-border/70 bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-extrabold flex items-center gap-1.5">
                            <CheckCircle2 className="size-4 stroke-[2.25]" /> Confirmée
                          </span>
                          {newStatus === "confirmed" && (
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                          Ajouter direct au planning
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStatus("new")}
                        className={cn(
                          "relative p-3 rounded-2xl border transition-all duration-200 flex flex-col items-start gap-1 cursor-pointer text-left shadow-2xs",
                          newStatus === "new"
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20"
                            : "border-border/70 bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-extrabold flex items-center gap-1.5">
                            <Clock className="size-4 stroke-[2.25]" /> À confirmer
                          </span>
                          {newStatus === "new" && (
                            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                          Attendre validation
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Slot, Party Size & Table Selection */}
              <div className="md:col-span-6 space-y-4 flex flex-col justify-between">
                <div className="bg-muted/30 dark:bg-muted/20 border border-border/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-4">
                      <CalendarDays className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Créneau & Table
                      </span>
                    </div>
                    
                    {/* Date & Time Row */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1">
                          Date *
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              type="button"
                              className={cn(
                                "w-full justify-start text-left font-bold text-xs rounded-xl bg-background/80 border-border/70 h-10 shadow-2xs gap-2 px-3 hover:bg-background hover:border-primary/50 transition-colors",
                                !newDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarDays className="size-4 text-primary shrink-0" />
                              <span className="truncate">
                                {newDate
                                  ? format(parseISO(newDate), "dd MMMM yyyy", { locale: dateFnsLocale(locale) })
                                  : "Date"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/80 bg-card" align="start">
                            <Calendar
                              mode="single"
                              selected={newDate ? parseISO(newDate) : undefined}
                              onSelect={(date) => {
                                if (date) setNewDate(format(date, "yyyy-MM-dd"));
                              }}
                              locale={dateFnsLocale(locale)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1">
                          Heure *
                        </Label>
                        <Select value={newTime} onValueChange={setNewTime}>
                          <SelectTrigger className="rounded-xl text-xs font-bold bg-background/80 border-border/70 h-10 shadow-2xs focus:ring-2 focus:ring-primary/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[220px]">
                            {SLOT_OPTIONS.map((slot) => (
                              <SelectItem key={slot} value={slot} className="text-xs font-medium">
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Party Size Stepper & Quick Pills */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                          <Users className="size-3.5 text-primary" /> Nb de personnes *
                        </Label>
                        <span className="text-xs font-extrabold text-primary bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <Users className="size-3" />
                          {newPartySize} {newPartySize > 1 ? "pers." : "per."}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {/* Stepper + Input */}
                        <div className="flex items-center justify-between gap-3 bg-background/60 border border-border/70 p-1.5 rounded-2xl shadow-2xs">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setNewPartySize((prev) => Math.max(1, prev - 1))}
                              disabled={newPartySize <= 1}
                              className="size-8 rounded-xl flex items-center justify-center bg-card border border-border/60 text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            >
                              <Minus className="size-3.5 stroke-[2.5]" />
                            </button>
                            <span className="w-10 text-center text-xs font-extrabold text-foreground">
                              {newPartySize}
                            </span>
                            <button
                              type="button"
                              onClick={() => setNewPartySize((prev) => Math.min(50, prev + 1))}
                              className="size-8 rounded-xl flex items-center justify-center bg-card border border-border/60 text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                              <Plus className="size-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-1.5 pr-1">
                            <span className="text-[11px] font-semibold text-muted-foreground">Autre:</span>
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              value={newPartySize}
                              onChange={(e) => setNewPartySize(Math.max(1, Number(e.target.value)))}
                              className="w-14 h-8 text-center text-xs font-extrabold rounded-xl bg-card border-border/70 px-1"
                            />
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 8, 10].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setNewPartySize(size)}
                              className={cn(
                                "h-8 flex-1 min-w-[32px] rounded-xl text-xs font-extrabold border transition-all duration-150 cursor-pointer flex items-center justify-center shadow-2xs",
                                newPartySize === size
                                  ? "border-primary bg-primary text-primary-foreground shadow-xs scale-105"
                                  : "border-border/70 bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground"
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Table Selection */}
                    <div className="space-y-1.5 pt-4">
                      <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                        <Hash className="size-3.5 text-primary" /> Table assignée
                      </Label>
                      <Select value={newTableNumber} onValueChange={setNewTableNumber}>
                        <SelectTrigger className="rounded-xl text-xs font-bold bg-background/80 border-border/70 h-10 shadow-2xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs font-medium text-muted-foreground">
                            Aucune table assignée
                          </SelectItem>
                          {(tables ?? []).map((t) => (
                            <SelectItem key={t.id} value={t.number} className="text-xs font-bold">
                              Table {t.number} ({t.seats} places)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2.5 pt-3 border-t border-border/60 shrink-0 flex-col-reverse sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-full sm:w-auto rounded-xl font-bold text-xs px-5 h-10 border-border/80 hover:bg-muted/80"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createReservationMutation.isPending}
                className="w-full sm:w-auto rounded-xl font-extrabold text-xs px-6 h-10 gap-2 bg-gradient-to-r from-primary to-orange-500 text-primary-foreground hover:from-primary/90 hover:to-orange-500/90 shadow-md hover:shadow-lg transition-all"
              >
                <Check className="size-4 stroke-[2.5]" />
                {createReservationMutation.isPending ? "Enregistrement..." : "Ajouter la réservation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReservationCard({
  reservation: r,
  children,
  onAssign,
}: {
  reservation: Reservation;
  children?: React.ReactNode;
  onAssign?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("Reservations");
  const dateLabel = format(parseISO(r.date), "EEEE d MMMM", { locale: dateFnsLocale(locale) });
  // Manual confirmation via a wa.me tap is allowed in v1 (plan.md §3D).
  const waHref = `https://wa.me/${r.customer_phone.replace(/\D/g, "").replace(/^0/, "212")}`;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* ── Left side: Reservation details ── */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium capitalize text-base">
                {dateLabel} · {r.time.slice(0, 5)}
              </p>
              <Badge variant="outline" className="shrink-0">
                <Users className="size-3.5 mr-1" /> {r.party_size}
              </Badge>
              <StatusBadge status={r.status} />
            </div>

            <p className="text-sm text-muted-foreground">
              {r.customer_name} ·{" "}
              <a
                href={`tel:${r.customer_phone}`}
                className="underline-offset-2 hover:underline"
              >
                {r.customer_phone}
              </a>
            </p>

            {r.note && (
              <p className="text-sm italic text-muted-foreground">
                « {r.note} »
              </p>
            )}

            <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
              >
                <MessageCircle className="size-4" /> {t("whatsapp")}
              </a>
              {onAssign && (
                <button
                  type="button"
                  onClick={onAssign}
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
                >
                  <MapPin className="size-4" />
                  {r.assigned_table_number
                    ? `Table ${r.assigned_table_number}`
                    : t("assignTable")}
                </button>
              )}
            </div>
          </div>

          {/* ── Right side: Action buttons stacked vertically ── */}
          {children && (
            <div className="flex flex-col gap-2 shrink-0 sm:min-w-[140px] items-stretch sm:items-end justify-center">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  const t = useTranslations("Reservations");
  if (status === "confirmed") return <Badge>{t("confirmed")}</Badge>;
  if (status === "declined") return <Badge variant="outline">{t("declined")}</Badge>;
  return <Badge variant="secondary">Nouvelle</Badge>;
}
