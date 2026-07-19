"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ActiveSession = {
  id: string;
  table_id: string;
  seated_at: string;
  customer_count: number;
  table: { number: string; seats: number } | null;
};

type TurnoverData = {
  active: ActiveSession[];
  today: { sessions: number; avgMinutes: number };
  week: { sessions: number; avgMinutes: number };
};

async function fetchTurnover(): Promise<TurnoverData> {
  const res = await fetch("/api/dashboard/tables/turnover");
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

// Tables occupy for tens of minutes, not seconds — a session that's just
// crossed into "trop long" (90min+) is the one signal worth flagging at a
// glance; everything else is informational.
const LONG_SESSION_MINUTES = 90;

export function TableTurnoverPanel() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());

  const { data } = useQuery({
    queryKey: ["table-turnover"],
    queryFn: fetchTurnover,
    staleTime: 30_000,
  });

  // Re-render every minute so "depuis X min" stays current without refetching.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // table_sessions is in the supabase_realtime publication (0015) — a table
  // being seated or vacated anywhere should refresh this panel immediately.
  useEffect(() => {
    const channel = supabase
      .channel("table-sessions-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_sessions" },
        () => queryClient.invalidateQueries({ queryKey: ["table-turnover"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const active = data?.active ?? [];
  const today = data?.today ?? { sessions: 0, avgMinutes: 0 };
  const week = data?.week ?? { sessions: 0, avgMinutes: 0 };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">Rotation des tables</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Occupées</p>
          <p className="text-3xl font-display font-bold text-foreground">{active.length}</p>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Aujourd&apos;hui</p>
          <p className="text-3xl font-display font-bold text-primary">
            {today.sessions} <span className="text-sm text-muted-foreground lowercase tracking-normal font-medium">services</span>
          </p>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm col-span-2 md:col-span-2">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Durée moyenne (7 jours)</p>
          <p className="text-3xl font-display font-bold text-foreground">
            {week.avgMinutes > 0 ? `${week.avgMinutes} min` : "—"}
            <span className="text-sm text-muted-foreground lowercase tracking-normal font-medium ml-2">
              sur {week.sessions} service{week.sessions > 1 ? "s" : ""}
            </span>
          </p>
        </div>
      </div>

      {active.length > 0 && (
        <div className="rounded-[24px] bg-card border border-border p-5 shadow-sm">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Occupées maintenant</p>
          <div className="flex flex-wrap gap-2.5">
            {active.map((s) => {
              const minutes = Math.round((now - new Date(s.seated_at).getTime()) / 60_000);
              const isLong = minutes >= LONG_SESSION_MINUTES;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5",
                    isLong
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-border/60 bg-muted/30",
                  )}
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-display font-bold text-[15px] border border-primary/20">
                    {s.table?.number ?? "—"}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[12.5px] font-bold",
                        isLong ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                      )}
                    >
                      <Clock className="size-3" />
                      {formatDistanceToNowStrict(new Date(s.seated_at), { locale: fr })}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="size-3" />
                      {s.customer_count} pers.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
