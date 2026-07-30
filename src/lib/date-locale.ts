import { enUS, fr } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

// date-fns has no notion of our app locales, so every public-site `format()`
// call goes through this map instead of importing `fr` directly — otherwise an
// English page renders French weekday/month names.
const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  fr,
  en: enUS,
};

export function dateFnsLocale(locale: string | undefined): DateFnsLocale {
  return DATE_FNS_LOCALES[isLocale(locale) ? locale : defaultLocale];
}
