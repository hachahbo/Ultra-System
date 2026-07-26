"use server";

import { cookies } from "next/headers";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
} from "@/i18n/config";

// Persists the chosen locale in a cookie. The LanguageSwitcher calls this and
// then router.refresh() so Server Components re-render with the new messages.
export async function setLocale(locale: string) {
  const value = isLocale(locale) ? locale : defaultLocale;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}
