"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type ActiveShift = { id: string; clock_in: string } | null;

async function fetchActive(): Promise<ActiveShift> {
  const res = await fetch("/api/dashboard/shifts/active");
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.shift ?? null;
}

// Visible to every role in the sidebar footer — clock-in/out isn't gated
// by canAccessRoute the way pages are, it's a per-person action available
// regardless of what the rest of the dashboard shows this role.
export function ClockWidget() {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  // Ticks once a minute purely to force a re-render so the elapsed-time
  // label below stays current — formatDistanceToNowStrict reads the clock
  // itself, this doesn't need to carry a value.
  const [, forceTick] = useState(0);

  const { data: shift } = useQuery({
    queryKey: ["shift-active"],
    queryFn: fetchActive,
    staleTime: 30_000,
  });

  useEffect(() => {
    const timer = setInterval(() => forceTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const clockIn = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/shifts/clock-in", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Pointage impossible");
      }
    },
    onSuccess: () => {
      toast.success("Service commencé");
      queryClient.invalidateQueries({ queryKey: ["shift-active"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/shifts/clock-out", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Dépointage impossible");
      }
    },
    onSuccess: () => {
      toast.success("Service terminé");
      queryClient.invalidateQueries({ queryKey: ["shift-active"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = !!shift;

  return (
    <SidebarMenuItem className="w-full">
      <SidebarMenuButton
        onClick={() => (active ? clockOut.mutate() : clockIn.mutate())}
        disabled={clockIn.isPending || clockOut.isPending}
        tooltip={active ? "Terminer le service" : "Commencer le service"}
        className={cn(
          "min-h-[44px] rounded-[14px] px-3.5 font-semibold transition-all duration-300",
          "group-data-[collapsible=icon]:!size-[40px] group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto",
          active
            ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
      >
        <Clock className={cn("size-[18px] mr-1.5 shrink-0 group-data-[collapsible=icon]:mr-0", active && "fill-current")} />
        <span className="text-[13.5px] group-data-[collapsible=icon]:hidden">
          {active && shift
            ? `En service · ${formatDistanceToNowStrict(new Date(shift.clock_in), { locale: fr })}`
            : "Commencer le service"}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
