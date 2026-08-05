"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { dateFnsLocale } from "@/lib/date-locale";
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
  const t = useTranslations("Labor");
  const locale = useLocale();
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
    onError: () => toast.error(t("rateUpdateFailed")),
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
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-2xs">
          <Clock className="size-4.5 stroke-[2.25]" />
        </div>
        <div>
          <h2 className="font-display text-lg font-black text-foreground leading-none">{t("title")}</h2>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Gérez les taux horaires et suivez le temps de travail de l&apos;équipe.
          </p>
        </div>
      </div>

      {active.length > 0 && (
        <div className="rounded-3xl bg-card/95 border border-border/80 p-4.5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("onDutyNow")}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {active.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 shadow-2xs"
              >
                <Clock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-extrabold text-foreground">{displayNameOf(s.email)}</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {t("since", {
                    duration: formatDistanceToNowStrict(new Date(s.clock_in), { locale: dateFnsLocale(locale) }),
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-sm">
        <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr] gap-4 border-b border-border/60 bg-muted/30 px-6 py-3.5">
          <div className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("colMember")}</div>
          <div className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("colRate")}</div>
          <div className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("colHours")}</div>
          <div className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("colCost")}</div>
        </div>

        {isPending && (
          <p className="py-10 text-center text-xs font-semibold text-muted-foreground">{t("loading")}</p>
        )}
        {!isPending && staff.length === 0 && (
          <p className="py-10 text-center text-xs font-semibold text-muted-foreground">{t("noStaff")}</p>
        )}

        {staff.map((s, idx) => {
          const totals = totalsByProfile.get(s.id) ?? { hours: 0, cost: 0 };
          const draft = rateDrafts[s.id];
          const displayValue = draft !== undefined ? draft : (s.hourly_rate_mad ?? "");
          return (
            <div
              key={s.id}
              className={cn(
                "grid grid-cols-[2fr_1.2fr_1fr_1fr] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-muted/20",
                idx > 0 && "border-t border-border/60",
                !s.active && "opacity-60",
              )}
            >
              <div className="text-xs font-extrabold text-foreground truncate">{displayNameOf(s.email)}</div>
              <div className="flex items-center gap-1.5">
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
                  className="h-9 w-24 rounded-xl text-xs font-bold bg-background/50 border-border/80 focus-visible:ring-primary/30 shadow-2xs"
                />
                <span className="text-[11px] font-bold text-muted-foreground">MAD/h</span>
              </div>
              <div className="text-xs font-bold text-muted-foreground tabular-nums">{totals.hours.toFixed(1)} h</div>
              <div className="text-xs font-extrabold text-foreground tabular-nums">
                {totals.cost > 0 ? formatPrice(totals.cost) : "—"}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11.5px] font-medium text-muted-foreground">
        {t("costNote")}
      </p>
    </section>
  );
}
