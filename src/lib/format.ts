export function formatPrice(amount: number, currency = "MAD") {
  const n = Number(amount);
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${formatted} ${currency}`;
}

// `locale` is the app locale ("fr" | "en"); callers that haven't been
// localized yet keep the previous French output.
const INTL_LOCALES: Record<string, string> = { fr: "fr-MA", en: "en-GB" };

export function formatDateTime(iso: string, locale = "fr") {
  return new Date(iso).toLocaleString(INTL_LOCALES[locale] ?? "fr-MA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
