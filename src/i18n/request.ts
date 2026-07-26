import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";

// Resolves the active locale per request from the NEXT_LOCALE cookie (set by
// the LanguageSwitcher), falling back to French. No URL prefix / routing —
// the whole app keeps its existing paths. next.config.ts wires this file via
// createNextIntlPlugin.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
