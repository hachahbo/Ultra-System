"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type StaffRow = {
  id: string;
  email: string;
  active: boolean;
  hourly_rate_mad: number | null;
};

type LaborData = {
  summary: { profile_id: string; day: string; hours: number; hourly_rate_mad: number | null; cost_mad: number }[];
  active: { id: string; profile_id: string; clock_in: string; email: string }[];
};

async function fetchLabor(): Promise<LaborData> {
  const res = await fetch("/api/dashboard/labor?days=14");
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

function displayNameOf(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LaborPanel({ staff }: { staff: StaffRow[] }) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["dashboard-labor"],
    queryFn: fetchLabor,
  });
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});

  const setRate = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number | null }) => {
      const res = await fetch(`/api/dashboard/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hourly_rate_mad: rate }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-labor"] });
    },
    onError: () => toast.error("Mise à jour du taux impossible"),
  });

  const active = data?.active ?? [];
  const summary = data?.summary ?? [];

  const totalsByProfile = new Map<string, { hours: number; cost: number }>();
  for (const row of summary) {
    const entry = totalsByProfile.get(row.profile_id) ?? { hours: 0, cost: 0 };
    entry.hours += Number(row.hours);
    entry.cost += Number(row.cost_mad);
    totalsByProfile.set(row.profile_id, entry);
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">Présence &amp; coût horaire</h2>

      {active.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm mb-4">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-3">En service maintenant</p>
          <div className="flex flex-wrap gap-2.5">
            {active.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2"
              >
                <Clock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[12.5px] font-bold text-foreground">{displayNameOf(s.email)}</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  depuis {formatDistanceToNowStrict(new Date(s.clock_in), { locale: fr })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[2fr_1.1fr_1fr_1fr] gap-4 border-b border-border bg-muted/30 px-6 py-3.5">
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground">MEMBRE</div>
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground">TAUX (MAD/H)</div>
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground">HEURES (14J)</div>
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground">COÛT (14J)</div>
        </div>

        {isPending && (
          <p className="py-10 text-center text-[13px] text-muted-foreground">Chargement…</p>
        )}
        {!isPending && staff.length === 0 && (
          <p className="py-10 text-center text-[13.5px] text-muted-foreground">Aucun membre du personnel.</p>
        )}

        {staff.map((s, idx) => {
          const totals = totalsByProfile.get(s.id) ?? { hours: 0, cost: 0 };
          const draft = rateDrafts[s.id];
          const displayValue = draft !== undefined ? draft : (s.hourly_rate_mad ?? "");
          return (
            <div
              key={s.id}
              className={cn(
                "grid grid-cols-[2fr_1.1fr_1fr_1fr] items-center gap-4 px-6 py-3",
                idx > 0 && "border-t border-border/50",
                !s.active && "opacity-60",
              )}
            >
              <div className="text-[13.5px] font-bold text-foreground truncate">{displayNameOf(s.email)}</div>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="—"
                value={displayValue}
                onChange={(e) => setRateDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                onBlur={() => {
                  if (draft === undefined) return;
                  const rate = draft.trim() === "" ? null : Number(draft);
                  setRate.mutate({ id: s.id, rate });
                  setRateDrafts((prev) => {
                    const next = { ...prev };
                    delete next[s.id];
                    return next;
                  });
                }}
                className="h-9 w-24 rounded-lg text-[13px]"
              />
              <div className="text-[13px] text-muted-foreground tabular-nums">{totals.hours.toFixed(1)} h</div>
              <div className="text-[13px] font-semibold text-foreground tabular-nums">
                {totals.cost > 0 ? formatPrice(totals.cost) : "—"}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11.5px] text-muted-foreground">
        Le coût n&apos;est calculé que pour les membres avec un taux horaire renseigné.
      </p>
    </section>
  );
}
