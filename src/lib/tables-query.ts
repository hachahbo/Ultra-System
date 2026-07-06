import type { DiningTable } from "@/lib/types";

// Shared across kitchen-view (orders map), reservations-view (reservation
// map) and the tables editor — keeps the TanStack query key/fetcher in sync
// across all three consumers of the floor plan.
export const tablesQueryKey = ["tables"] as const;

export async function fetchTables(): Promise<DiningTable[]> {
  const res = await fetch("/api/dashboard/tables");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).tables;
}
