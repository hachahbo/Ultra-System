"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Globe, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { setLocale } from "@/i18n/actions";
import { locales, LOCALE_LABELS, type Locale } from "@/i18n/config";

// Toggles the app locale by writing the NEXT_LOCALE cookie (server action)
// then refreshing so Server Components re-render with the new messages.
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSelect(locale: Locale) {
    if (locale === active) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("language")}
          disabled={isPending}
          className={cn(
            // Base pill
            "group relative inline-flex items-center gap-2 rounded-full px-3.5 py-2",
            // Glass + border
            "border border-white/15 dark:border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl",
            // Shadow
            "shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]",
            // Hover
            "hover:border-[#FF6B35]/40 hover:bg-white/20 dark:hover:bg-white/8 hover:shadow-[0_4px_16px_rgba(255,107,53,0.15)]",
            // Typography
            "text-xs font-bold text-foreground",
            // Transitions
            "transition-all duration-300",
            // Focus
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/60",
            // Pending
            "disabled:opacity-50 cursor-pointer",
            className,
          )}
        >
          {/* Spinning globe — spins while pending */}
          <Globe
            className={cn(
              "size-3.5 text-[#FF6B35] transition-all duration-500",
              isPending ? "animate-spin" : "group-hover:rotate-[20deg] group-data-[state=open]:rotate-[-10deg]",
            )}
          />
          {/* Active locale code */}
          <span className="uppercase tracking-[0.15em] font-black text-[11px]">
            {active}
          </span>
          <ChevronDown
            className={cn(
              "size-3 text-muted-foreground/60 transition-transform duration-300",
              "group-data-[state=open]:rotate-180",
            )}
          />

          {/* Subtle inner highlight */}
          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className={cn(
          "w-52 rounded-[20px] p-2",
          // Glass
          "border border-white/15 dark:border-white/8",
          "bg-white/80 dark:bg-[#111]/85 backdrop-blur-2xl",
          // Shadows
          "shadow-[0_20px_60px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.08)]",
          "dark:shadow-[0_20px_60px_rgba(0,0,0,0.55),0_4px_16px_rgba(0,0,0,0.4)]",
          "z-[200]",
        )}
      >
        {/* Section label */}
        <div className="px-3 pt-1 pb-2 flex items-center gap-2">
          <Globe className="size-3 text-[#FF6B35]/70" />
          <span className="text-[9px] font-black tracking-[0.22em] uppercase text-muted-foreground/60">
            {t("language")}
          </span>
        </div>

        {/* Gradient separator */}
        <div className="h-px mx-2 mb-1.5 bg-gradient-to-r from-transparent via-[#FF6B35]/20 to-transparent" />

        {/* Locale options */}
        {locales.map((locale) => {
          const isActive = locale === active;
          return (
            <DropdownMenuItem
              key={locale}
              onSelect={() => onSelect(locale)}
              onClick={() => onSelect(locale)}
              className={cn(
                "group/item relative flex cursor-pointer items-center justify-between gap-3",
                "rounded-2xl px-3 py-2.5 my-0.5",
                "text-sm font-semibold",
                "transition-all duration-200",
                "focus:outline-none",
                isActive
                  ? [
                      "bg-gradient-to-r from-[#FF6B35]/12 to-[#FF6B35]/5",
                      "text-[#FF6B35]",
                      "ring-1 ring-[#FF6B35]/20",
                    ]
                  : [
                      "text-foreground/80 hover:text-foreground",
                      "hover:bg-black/5 dark:hover:bg-white/8",
                    ],
              )}
            >
              <span className="flex items-center gap-3">
                {/* Locale badge */}
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-xl",
                    "text-[10px] font-black uppercase tracking-wider",
                    "transition-all duration-200",
                    isActive
                      ? "bg-[#FF6B35] text-white shadow-[0_3px_10px_rgba(255,107,53,0.4)]"
                      : "bg-black/8 dark:bg-white/10 text-muted-foreground group-hover/item:bg-black/12 dark:group-hover/item:bg-white/15",
                  )}
                >
                  {locale}
                </span>
                <span className={cn("font-medium", isActive ? "font-semibold" : "")}>
                  {LOCALE_LABELS[locale]}
                </span>
              </span>

              {/* Animated checkmark */}
              {isActive && (
                <Check
                  className="size-4 text-[#FF6B35] stroke-[2.5] shrink-0"
                  style={{ filter: "drop-shadow(0 1px 4px rgba(255,107,53,0.4))" }}
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
