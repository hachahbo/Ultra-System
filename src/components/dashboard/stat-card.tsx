"use client";

import CountUp from "react-countup";
import { useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  brand: "text-primary bg-primary/10",
  green: "text-emerald-600 bg-emerald-500/10",
  blue: "text-blue-600 bg-blue-500/10",
  purple: "text-purple-600 bg-purple-500/10",
  amber: "text-amber-600 bg-amber-500/10",
} as const;

export type IconTone = keyof typeof TONE_CLASSES;

export function StatCard({
  label,
  value,
  unit,
  deltaPct,
  icon: Icon,
  iconTone,
}: {
  label: string;
  value: number;
  unit?: string;
  deltaPct?: number;
  series?: number[];
  icon: LucideIcon;
  iconTone: IconTone;
}) {
  const reduced = useReducedMotion();
  const hasDelta = typeof deltaPct === "number";
  const deltaDirection = hasDelta ? (deltaPct! > 0 ? "up" : deltaPct! < 0 ? "down" : "flat") : null;

  return (
    <div className="group flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:p-6">
      {/* Top: Icon and Delta */}
      <div className="flex items-start justify-between">
        <div className={cn("flex size-11 items-center justify-center rounded-xl", TONE_CLASSES[iconTone])}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
        {hasDelta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-sm font-medium tabular-nums",
              deltaDirection === "up" && "text-emerald-500",
              deltaDirection === "down" && "text-red-500",
              deltaDirection === "flat" && "text-muted-foreground",
            )}
          >
            {deltaDirection === "up" && "+"}
            {deltaPct! > 0 && deltaDirection !== "up" ? "+" : ""}
            {Math.round(deltaPct!)}%
          </span>
        ) : null}
      </div>

      {/* Bottom: Label and Value */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">
          {label}
        </p>
        <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
          {reduced ? (
            value.toLocaleString("fr-FR")
          ) : (
            <CountUp end={value} duration={0.8} separator=" " />
          )}
          {unit && <span className="ml-1 text-2xl font-semibold text-muted-foreground">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
