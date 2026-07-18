import { isToday, isTomorrow, format } from "date-fns";
import { fr } from "date-fns/locale";
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

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in: "En stock",
  low: "Stock bas",
  out: "Rupture",
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

export function formatEta(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return `Auj. ${format(date, "H'h'", { locale: fr })}`;
  if (isTomorrow(date)) return "Demain";
  return format(date, "EEE. H'h'", { locale: fr });
}
