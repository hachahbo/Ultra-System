"use client";

import Image from "next/image";
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
  iconUrl,
  iconTone,
  variant = "default",
}: {
  label: string;
  value: number;
  unit?: string;
  deltaPct?: number;
  series?: number[];
  icon?: LucideIcon;
  iconUrl?: string;
  iconTone?: IconTone;
  variant?: "default" | "solid-orange" | "solid-dark" | "solid-black";
}) {
  const reduced = useReducedMotion();
  const hasDelta = typeof deltaPct === "number";
  const deltaDirection = hasDelta ? (deltaPct! > 0 ? "up" : deltaPct! < 0 ? "down" : "flat") : null;

  const isOrange = variant === "solid-orange";
  const isDark = variant === "solid-dark";
  const isBlack = variant === "solid-black";

  return (
    <div className={cn(
      "group flex flex-col gap-5 rounded-[22px] border p-5 shadow-sm transition-all hover:-translate-y-1 md:p-6 relative overflow-hidden",
      isOrange
        ? "bg-gradient-to-br from-[#ff8a5c] to-[#f36b32] border-transparent text-white hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]"
        : isDark
          ? "bg-gradient-to-br from-[#334155] to-[#1e293b] dark:from-[#1e293b] dark:to-[#0f172a] border-transparent text-white shadow-none"
          : isBlack
            ? "border-white/40 bg-gradient-to-br from-white/80 to-white/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] text-foreground dark:from-[#1a1a1a] dark:to-[#000] dark:border-0 dark:text-white dark:shadow-none"
            : "border-white/40 bg-gradient-to-br from-white/80 to-white/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] text-foreground dark:border-white/10 dark:from-black/40 dark:to-black/10 dark:shadow-none"
    )}>
      {/* Top: Icon and Delta */}
      <div className="flex items-start justify-between">
        {iconUrl ? (
          <div className="flex size-14 items-center justify-center shrink-0">
            <Image src={iconUrl} alt={label} width={56} height={56} className="size-14 object-contain" />
          </div>
        ) : Icon ? (
          <div className={cn(
            "flex size-14 items-center justify-center rounded-xl shrink-0",
            isOrange ? "bg-white/20 text-white" : iconTone ? TONE_CLASSES[iconTone] : ""
          )}>
            <Icon className="size-6" aria-hidden="true" />
          </div>
        ) : <div className="size-14" />}
        {hasDelta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-sm font-medium tabular-nums",
              isOrange
                ? "bg-white/20 px-2.5 py-1 rounded-full text-white"
                : cn(
                  deltaDirection === "up" && "text-emerald-500",
                  deltaDirection === "down" && "text-red-500",
                  deltaDirection === "flat" && "text-muted-foreground",
                )
            )}
          >
            {deltaDirection === "up" && "+"}
            {deltaPct! > 0 && deltaDirection !== "up" ? "+" : ""}
            {Math.round(deltaPct!)}%
          </span>
        ) : null}
      </div>

      {/* Bottom: Label and Value */}
      <div className="flex items-end justify-between gap-4 mt-auto">
        <p className={cn(
          "text-base font-semibold leading-tight",
          isOrange ? "text-white/90" : isDark ? "text-slate-300" : isBlack ? "text-muted-foreground dark:text-slate-300" : "text-muted-foreground"
        )}>
          {label}
        </p>
        <p className={cn(
          "text-3xl font-bold tracking-tight tabular-nums text-right leading-none",
          isOrange || isDark ? "text-white" : isBlack ? "text-foreground dark:text-white" : "text-foreground"
        )}>
          {reduced ? (
            value.toLocaleString("fr-FR")
          ) : (
            <CountUp end={value} duration={0.8} separator=" " />
          )}
          {unit && <span className={cn(
            "ml-1 text-2xl font-semibold",
            isOrange ? "text-white/90" : isDark ? "text-slate-300" : "text-muted-foreground"
          )}>{unit}</span>}
        </p>
      </div>
    </div>
  );
}
