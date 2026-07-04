"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, MessageCircle, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Reservation } from "@/lib/types";

async function fetchReservations(): Promise<Reservation[]> {
  const res = await fetch("/api/dashboard/reservations");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).reservations;
}

export function ReservationsView() {
  const queryClient = useQueryClient();
  const { data: reservations, isPending } = useQuery({
    queryKey: ["reservations"],
    queryFn: fetchReservations,
    refetchInterval: 30_000,
  });

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Reservation["status"];
    }) => {
      const res = await fetch(`/api/dashboard/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reservations"] }),
    onError: () => toast.error("Impossible de mettre à jour la réservation"),
  });

  const pending = (reservations ?? []).filter((r) => r.status === "new");
  const decided = (reservations ?? []).filter((r) => r.status !== "new");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Réservations</h1>

      <section className="mt-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          À confirmer{pending.length > 0 && ` (${pending.length})`}
        </h2>
        <div className="mt-2 space-y-3">
          {isPending && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chargement…
            </p>
          )}
          {!isPending && pending.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune demande en attente.
            </p>
          )}
          {pending.map((r) => (
            <ReservationCard key={r.id} reservation={r}>
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
          <h2 className="text-sm font-medium text-muted-foreground">
            À venir
          </h2>
          <div className="mt-2 space-y-3">
            {decided.map((r) => (
              <ReservationCard key={r.id} reservation={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReservationCard({
  reservation: r,
  children,
}: {
  reservation: Reservation;
  children?: React.ReactNode;
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
        <div className="mt-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
          >
            <MessageCircle className="size-4" /> Écrire sur WhatsApp
          </a>
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
