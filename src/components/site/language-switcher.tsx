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
            "group inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/15 bg-background/80 dark:bg-stone-900/80 px-3.5 py-2 text-xs font-bold text-foreground backdrop-blur-md transition-all duration-200 hover:border-[#FF6B35]/50 hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] disabled:opacity-60 cursor-pointer",
            className,
          )}
        >
          <Globe className="size-3.5 text-[#FF6B35] transition-transform duration-300 group-hover:rotate-12" />
          <span className="uppercase tracking-wider font-extrabold">{active}</span>
          <ChevronDown className="size-3 text-muted-foreground/70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-48 rounded-2xl border border-black/10 dark:border-white/15 bg-background/95 dark:bg-[#181513]/95 p-1.5 text-foreground backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/70">
          {t("language")}
        </div>
        <div className="h-px bg-border/40 my-1 -mx-1.5" />
        {locales.map((locale) => {
          const isActive = locale === active;
          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => onSelect(locale)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 my-0.5",
                isActive
                  ? "bg-[#FF6B35]/15 text-[#FF6B35] dark:bg-[#FF6B35]/25 dark:text-[#FF6B35]"
                  : "text-foreground/90 hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-colors",
                    isActive
                      ? "bg-[#FF6B35] text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {locale}
                </span>
                <span className="font-medium text-sm">{LOCALE_LABELS[locale]}</span>
              </span>
              {isActive && <Check className="size-4 text-[#FF6B35] stroke-[2.5]" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
