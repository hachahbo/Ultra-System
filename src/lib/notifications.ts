import type { NotificationItem } from "@/app/api/dashboard/notifications/route";

/** Stable identity for a feed entry — ids are only unique within a kind. */
export function notifKey(n: Pick<NotificationItem, "kind" | "id">) {
  return `${n.kind}-${n.id}`;
}

/**
 * Picks which feed entries deserve a toast, and records them as seen.
 *
 * `seen` is the running set of already-toasted keys. It is mutated: every
 * fresh entry is recorded, including ones trimmed by `max`, so a burst never
 * re-toasts on the next poll.
 *
 * Returns oldest-first, capped to the `max` newest — a reconnect after the tab
 * slept can surface several items at once, and burying the screen in toasts is
 * worse than letting the bell carry the overflow.
 */
export function selectNotificationsToToast(
  seen: Set<string>,
  items: NotificationItem[],
  max: number,
): NotificationItem[] {
  const fresh = items.filter((n) => !seen.has(notifKey(n)));
  for (const n of fresh) seen.add(notifKey(n));

  return fresh
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-max);
}
