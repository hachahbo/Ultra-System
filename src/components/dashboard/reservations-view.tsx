"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  LayoutGrid,
  List,
  MapPin,
  MessageCircle,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
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
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "map">("list");
  const [dayFilter, setDayFilter] = useState<DayFilter>("upcoming");
  const [mapDate, setMapDate] = useState(() => dayBucket(new Date()));
  const [mapTime, setMapTime] = useState("12:00");
  const [assigning, setAssigning] = useState<Reservation | null>(null);

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
    onError: () => toast.error("Impossible de mettre à jour la réservation"),
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
    onError: () => toast.error("Attribution impossible"),
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
        <h1 className="font-display text-2xl font-semibold">Réservations</h1>
        <div className="flex rounded-lg border p-0.5">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Vue liste"
            onClick={() => setView("list")}
          >
            <List className="size-4" />
          </Button>
          <Button
            variant={view === "map" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Vue plan de salle"
            onClick={() => setView("map")}
          >
            <LayoutGrid className="size-4" />
          </Button>
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
            Tables réservées (rouge) et libres (vert) pour ce créneau.
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
              <TabsTrigger value="upcoming">À venir</TabsTrigger>
              <TabsTrigger value="past">Passées</TabsTrigger>
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
                  title="Aucune demande en attente"
                  hint="Les nouvelles réservations apparaîtront ici."
                />
              )}
              {pending.map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  onAssign={() => setAssigning(r)}
                >
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => setStatus.mutate({ id: r.id, status: "confirmed" })}
                      disabled={setStatus.isPending}
                    >
                      <Check className="size-4" /> Confirmer
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStatus.mutate({ id: r.id, status: "declined" })}
                      disabled={setStatus.isPending}
                    >
                      <X className="size-4" /> Refuser
                    </Button>
                  </div>
                </ReservationCard>
              ))}
            </div>
          </section>

          {decided.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-muted-foreground">Réservations</h2>
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

      <Dialog open={assigning !== null} onOpenChange={(open) => !open && setAssigning(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {assigning ? `Assigner une table — ${assigning.customer_name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {assigning && (
            <>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(assigning.date), "EEEE d MMMM", { locale: fr })} ·{" "}
                {assigning.time.slice(0, 5)} · {assigning.party_size} pers.
              </p>
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
              <p className="text-xs text-muted-foreground">
                Touchez une table libre pour l&apos;assigner. Touchez à nouveau la
                table assignée pour la retirer.
              </p>
            </>
          )}
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
  const dateLabel = format(parseISO(r.date), "EEEE d MMMM", { locale: fr });
  // Manual confirmation via a wa.me tap is allowed in v1 (plan.md §3D).
  const waHref = `https://wa.me/${r.customer_phone.replace(/\D/g, "").replace(/^0/, "212")}`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium capitalize">
              {dateLabel} · {r.time.slice(0, 5)}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {r.customer_name} ·{" "}
              <a
                href={`tel:${r.customer_phone}`}
                className="underline-offset-2 hover:underline"
              >
                {r.customer_phone}
              </a>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Users className="size-3.5" /> {r.party_size}
            </Badge>
            <StatusBadge status={r.status} />
          </div>
        </div>
        {r.note && (
          <p className="mt-2 text-sm italic text-muted-foreground">
            « {r.note} »
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
          >
            <MessageCircle className="size-4" /> Écrire sur WhatsApp
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
                : "Assigner une table"}
            </button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  if (status === "confirmed") return <Badge>Confirmée</Badge>;
  if (status === "declined") return <Badge variant="outline">Refusée</Badge>;
  return <Badge variant="secondary">Nouvelle</Badge>;
}
