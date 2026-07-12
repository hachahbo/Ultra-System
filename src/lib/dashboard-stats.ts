import "server-only";
import { dayBucket } from "@/lib/time";

/** Sums getValue(row) into day buckets (Casablanca-local), keyed by dayBucket(). */
export function dailyBuckets<T>(
  rows: T[],
  getDate: (row: T) => string,
  getValue: (row: T) => number = () => 1,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = dayBucket(getDate(row));
    map.set(key, (map.get(key) ?? 0) + getValue(row));
  }
  return map;
}

/** The 7 day-bucket keys ending at `reference`, oldest first (for sparklines). */
export function last7Keys(reference = new Date()): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    dayBucket(new Date(reference.getTime() - (6 - i) * 86_400_000)),
  );
}

export function keyDaysAgo(n: number, reference = new Date()): string {
  return dayBucket(new Date(reference.getTime() - n * 86_400_000));
}

/** Percent change, treating a 0 -> N move as +100% rather than dividing by zero. */
export function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}
