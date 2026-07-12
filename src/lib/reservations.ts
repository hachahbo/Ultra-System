import { slotKey } from "@/lib/time";
import type { DiningTable, Reservation } from "@/lib/types";

const OVERLAP_MINUTES = 90;

/**
 * A table counts as reserved for a given date/time slot if a still-live
 * reservation (new or confirmed) is assigned to it within ±90 minutes.
 * Deliberately simple — no seating-duration model, per plan.md scope.
 */
export function isTableReserved(
  table: DiningTable,
  reservations: Reservation[],
  date: string,
  time: string,
): boolean {
  const target = slotKey(time);
  return reservations.some((r) => {
    if (r.assigned_table_number !== table.number) return false;
    if (r.date !== date) return false;
    if (r.status !== "new" && r.status !== "confirmed") return false;
    return Math.abs(slotKey(r.time.slice(0, 5)) - target) < OVERLAP_MINUTES;
  });
}
