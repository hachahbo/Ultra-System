"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
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
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[13px] font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60",
            className,
          )}
        >
          <Globe className="size-4" />
          <span className="uppercase">{active}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => onSelect(locale)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-lg font-semibold"
          >
            <span className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">{locale}</span>
              {LOCALE_LABELS[locale]}
            </span>
            {locale === active && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
