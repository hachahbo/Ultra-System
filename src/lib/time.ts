// Central timezone helper for the pilot restaurant (Tangier, Morocco).
// Every day-boundary/bucketing computation in the dashboard must go through
// here — never call date-fns' startOfToday()/startOfWeek() directly
// elsewhere, or "today" silently drifts to UTC's midnight instead of Casa's.
import { startOfWeek as dfStartOfWeek, format } from "date-fns";

export const TZ = "Africa/Casablanca";

function casaOffsetMinutes(date: Date): number {
  // Morocco observes permanent DST-like +1 since 2018 (no seasonal changes),
  // but Intl keeps this correct even if that policy ever changes.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUTC - date.getTime()) / 60_000;
}

/** The Date, shifted so its UTC getters read as Casablanca local time. */
function toCasaShifted(date: Date): Date {
  return new Date(date.getTime() + casaOffsetMinutes(date) * 60_000);
}

export function startOfTodayCasa(reference = new Date()): Date {
  const shifted = toCasaShifted(reference);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const startShifted = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  return new Date(startShifted.getTime() - casaOffsetMinutes(reference) * 60_000);
}

export function endOfTodayCasa(reference = new Date()): Date {
  const start = startOfTodayCasa(reference);
  return new Date(start.getTime() + 24 * 60 * 60_000 - 1);
}

/** yyyy-mm-dd bucket key for `date`, in Casablanca local time. */
export function dayBucket(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const shifted = toCasaShifted(d);
  return format(shifted, "yyyy-MM-dd");
}

/** Monday-start ISO week bucket key (yyyy-mm-dd of the Monday), Casa-local. */
export function weekBucket(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const shifted = toCasaShifted(d);
  return format(dfStartOfWeek(shifted, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/** Hour-of-day (0-23) in Casablanca local time. */
export function casaHour(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return toCasaShifted(d).getUTCHours();
}

/** Minutes since midnight for a "HH:mm" slot, used for reservation overlap math. */
export function slotKey(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
