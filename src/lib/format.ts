export function formatPrice(amount: number, currency = "MAD") {
  const n = Number(amount);
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${formatted} ${currency}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
