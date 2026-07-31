import { isToday, isTomorrow, format } from "date-fns";
import { dateFnsLocale } from "@/lib/date-locale";
import type { Delivery, InventoryCategory, InventoryItem, Supplier } from "@/lib/types";
import type { Role } from "@/lib/permissions";

// Shared across inventory-view — keeps the TanStack query key/fetcher in
// sync for every consumer (mirrors tables-query.ts).
export const inventoryQueryKey = ["dashboard-inventory"] as const;

export type InventoryData = {
  role: Role;
  categories: InventoryCategory[];
  items: InventoryItem[];
  suppliers: Supplier[];
  deliveries: Delivery[];
};

export async function fetchInventory(): Promise<InventoryData> {
  const res = await fetch("/api/dashboard/inventory");
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

export type StockStatus = "in" | "low" | "out";

// Message keys into the Inventory.* namespace, not display text.
export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in: "inStock",
  low: "stockLow",
  out: "stockOut",
};

export function statusOf(item: Pick<InventoryItem, "stock" | "min_threshold">): StockStatus {
  if (item.stock <= 0) return "out";
  if (item.stock < item.min_threshold) return "low";
  return "in";
}

export function stockValue(items: InventoryItem[]): number {
  return items.reduce((sum, item) => sum + item.stock * item.unit_price_mad, 0);
}

export function lowStockCount(items: InventoryItem[]): number {
  return items.filter((item) => statusOf(item) !== "in").length;
}

/**
 * Delivery ETA, in the caller's language. Patterns come from the message
 * catalogue rather than being hardcoded, because "H'h'" is a French
 * convention that reads wrong in English.
 */
export function formatEta(
  iso: string,
  locale: string,
  labels: { today: (time: string) => string; tomorrow: string; formatToday: string; formatOther: string },
): string {
  const date = new Date(iso);
  const dateLocale = dateFnsLocale(locale);
  if (isToday(date)) return labels.today(format(date, labels.formatToday, { locale: dateLocale }));
  if (isTomorrow(date)) return labels.tomorrow;
  return format(date, labels.formatOther, { locale: dateLocale });
}
