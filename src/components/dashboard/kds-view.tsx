"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Clock, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ──────────────────────────────────────────────────────────────────

type Station = { id: string; name: string; sort_order: number };

type KdsLine = { item_id: string; name: string; quantity: number; options: string[] };

type KdsOrderContext = {
  id: string;
  table_number: string | null;
  type: "dine_in" | "takeaway" | "delivery";
  customer_name: string | null;
  note: string | null;
  created_at: string;
};

type KdsTicket = {
  id: string;
  order_id: string;
  station_id: string | null;
  lines: KdsLine[];
  status: "pending" | "bumped";
  created_at: string;
  bumped_at: string | null;
  order: KdsOrderContext;
};

// ── API Calls ──────────────────────────────────────────────────────────────

async function fetchKdsData(): Promise<{ tickets: KdsTicket[]; stations: Station[] }> {
  const res = await fetch("/api/dashboard/kds");
  if (!res.ok) throw new Error("Impossible de charger le KDS");
  return res.json();
}

async function bumpTicket(ticketId: string): Promise<void> {
  const res = await fetch(`/api/dashboard/kds/${ticketId}`, { method: "PATCH" });
  if (!res.ok) throw new Error("Impossible de terminer le bon");
}

// ── Component ──────────────────────────────────────────────────────────────

export function KdsView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [selectedStation, setSelectedStation] = useState<string | "all">("all");
  const [now, setNow] = useState(Date.now());

  // Force re-render every minute to update the "il y a X minutes" times
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["kds-tickets"],
    queryFn: fetchKdsData,
    staleTime: 60_000,
  });

  const bumpMutation = useMutation({
    mutationFn: bumpTicket,
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["kds-tickets"] });
      const prev = queryClient.getQueryData<{ tickets: KdsTicket[]; stations: Station[] }>(["kds-tickets"]);
      if (prev) {
        queryClient.setQueryData(["kds-tickets"], {
          ...prev,
          tickets: prev.tickets.map((t) =>
            t.id === id ? { ...t, status: "bumped", bumped_at: new Date().toISOString() } : t
          ),
        });
      }
      return { prev };
    },
    onError: (err, id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["kds-tickets"], ctx.prev);
      toast.error(err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["kds-tickets"] });
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("kds-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "kds_tickets" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["kds-tickets"] });
          // Optional: play a subtle notification sound here for new tickets
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "kds_tickets" },
        () => queryClient.invalidateQueries({ queryKey: ["kds-tickets"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const stations = data?.stations ?? [];
  const tickets = data?.tickets ?? [];

  // Filter & sort tickets (pending only, oldest first)
  const pendingTickets = useMemo(() => {
    return tickets
      .filter((t) => t.status === "pending" && (selectedStation === "all" || t.station_id === selectedStation))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [tickets, selectedStation]);

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full overflow-x-auto">
        <Skeleton className="w-[300px] h-[400px] shrink-0 rounded-xl" />
        <Skeleton className="w-[300px] h-[400px] shrink-0 rounded-xl" />
        <Skeleton className="w-[300px] h-[400px] shrink-0 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fcfaf8] dark:bg-black rounded-[20px] border border-border overflow-hidden">
      {/* Station Tabs */}
      <div className="flex items-center gap-2 p-4 border-b overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => setSelectedStation("all")}
          className={cn(
            "px-5 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all border",
            selectedStation === "all"
              ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
              : "bg-white text-muted-foreground border-border hover:bg-accent hover:text-foreground dark:bg-white/5"
          )}
        >
          Toutes les stations
        </button>
        {stations.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStation(s.id)}
            className={cn(
              "px-5 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all border",
              selectedStation === s.id
                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                : "bg-white text-muted-foreground border-border hover:bg-accent hover:text-foreground dark:bg-white/5"
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Ticket Grid (Horizontal scroll for KDS) */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4 items-start bg-[#fcfaf8] dark:bg-[#0c0c0e]">
        {pendingTickets.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <UtensilsCrossed className="size-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucun bon en attente</p>
            <p className="text-sm opacity-60">La cuisine est propre !</p>
          </div>
        ) : (
          pendingTickets.map((ticket) => {
            const ageMs = Date.now() - new Date(ticket.created_at).getTime();
            const ageMins = Math.floor(ageMs / 60000);
            
            // Visual indicators for ticket age
            const isWarning = ageMins >= 15 && ageMins < 30;
            const isDanger = ageMins >= 30;

            const st = stations.find((s) => s.id === ticket.station_id);

            return (
              <div
                key={ticket.id}
                className={cn(
                  "w-[300px] shrink-0 rounded-[16px] bg-white dark:bg-[#1a1a1c] border overflow-hidden flex flex-col shadow-sm transition-all",
                  isDanger
                    ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                    : isWarning
                    ? "border-orange-500/50"
                    : "border-border dark:border-white/10"
                )}
              >
                {/* Header */}
                <div
                  className={cn(
                    "p-3 border-b border-border flex justify-between items-start",
                    isDanger ? "bg-red-500/10" : isWarning ? "bg-orange-500/10" : "bg-accent/30"
                  )}
                >
                  <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      {st ? st.name : "Général"}
                    </div>
                    <div className="text-[15px] font-extrabold flex items-center gap-2">
                      #{ticket.order.id.slice(0, 5).toUpperCase()}
                      {ticket.order.table_number && (
                        <span className="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-2 py-0.5 rounded-md">
                          Table {ticket.order.table_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        "text-xs font-bold flex items-center gap-1",
                        isDanger ? "text-red-500" : isWarning ? "text-orange-500" : "text-muted-foreground"
                      )}
                    >
                      <Clock className="size-3.5" />
                      {formatDistanceToNowStrict(new Date(ticket.created_at), { locale: fr, addSuffix: false })}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                      {ticket.order.type === "dine_in" ? "Sur place" : ticket.order.type === "takeaway" ? "À emporter" : "Livraison"}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto min-h-[200px]">
                  {ticket.lines.map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="font-extrabold text-[15px] text-foreground shrink-0 w-6">
                        {line.quantity}x
                      </div>
                      <div>
                        <div className="font-bold text-[14px] leading-snug">{line.name}</div>
                        {line.options.length > 0 && (
                          <div className="text-[12px] text-muted-foreground font-medium mt-1 leading-tight">
                            {line.options.map((opt) => (
                              <span key={opt} className="block">— {opt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {ticket.order.note && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 font-medium italic">
                      Note: {ticket.order.note}
                    </div>
                  )}
                </div>

                {/* Footer Bump Action */}
                <div className="p-3 border-t border-border bg-white dark:bg-[#1a1a1c]">
                  <button
                    onClick={() => bumpMutation.mutate(ticket.id)}
                    disabled={bumpMutation.isPending}
                    className="w-full py-3 rounded-xl bg-[#ec5b1a] text-white font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[#d94a09] transition-colors disabled:opacity-50"
                  >
                    <Check className="size-4" />
                    Terminer le bon
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
