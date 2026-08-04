import { describe, expect, it } from "vitest";
import { notifKey, selectNotificationsToToast } from "@/lib/notifications";
import type { NotificationItem } from "@/app/api/dashboard/notifications/route";

function item(id: string, minutesAgo: number, kind: NotificationItem["kind"] = "order") {
  return {
    id,
    kind,
    title: `Notif ${id}`,
    subtitle: "sub",
    created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    href: "/dashboard/orders",
  } satisfies NotificationItem;
}

describe("notifKey", () => {
  it("namespaces by kind, since ids are only unique within a kind", () => {
    expect(notifKey({ kind: "order", id: "abc" })).not.toBe(
      notifKey({ kind: "reservation", id: "abc" }),
    );
  });
});

describe("selectNotificationsToToast", () => {
  it("toasts entries the set hasn't seen", () => {
    const seen = new Set([notifKey({ kind: "order", id: "old" })]);
    const picked = selectNotificationsToToast(seen, [item("old", 10), item("new", 1)], 3);
    expect(picked.map((n) => n.id)).toEqual(["new"]);
  });

  it("never re-toasts on a later poll", () => {
    const seen = new Set<string>();
    const feed = [item("a", 2), item("b", 1)];
    expect(selectNotificationsToToast(seen, feed, 3)).toHaveLength(2);
    expect(selectNotificationsToToast(seen, feed, 3)).toHaveLength(0);
  });

  it("caps a burst to the newest few, oldest-first", () => {
    const seen = new Set<string>();
    const burst = [item("a", 50), item("b", 40), item("c", 30), item("d", 20), item("e", 10)];
    const picked = selectNotificationsToToast(seen, burst, 3);
    expect(picked.map((n) => n.id)).toEqual(["c", "d", "e"]);
  });

  // The trimmed ones are still recorded — otherwise the next poll would toast
  // the overflow that was deliberately suppressed.
  it("marks trimmed entries as seen too", () => {
    const seen = new Set<string>();
    const burst = [item("a", 50), item("b", 40), item("c", 30), item("d", 20), item("e", 10)];
    selectNotificationsToToast(seen, burst, 2);
    expect(seen.size).toBe(5);
    expect(selectNotificationsToToast(seen, burst, 2)).toHaveLength(0);
  });

  it("does not mutate the input array's order", () => {
    const seen = new Set<string>();
    const feed = [item("newest", 1), item("oldest", 90)];
    selectNotificationsToToast(seen, feed, 5);
    expect(feed.map((n) => n.id)).toEqual(["newest", "oldest"]);
  });

  it("distinguishes same-id entries of different kinds", () => {
    const seen = new Set<string>();
    const picked = selectNotificationsToToast(
      seen,
      [item("x", 2, "order"), item("x", 1, "reservation")],
      5,
    );
    expect(picked).toHaveLength(2);
  });
});
