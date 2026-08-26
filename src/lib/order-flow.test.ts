import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { ROLES, type Role } from "./permissions";
import {
  allowedTransitions,
  canTransition,
  isActive,
  isInKitchen,
  isTerminal,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  SYSTEM_TRANSITIONS,
  type OrderStatus,
} from "./order-flow";

// Hardcoded expected machine, independent of ORDER_TRANSITIONS' internal
// shape — the same regression-guard trick permissions.test.ts uses. If someone
// edits the transition table and silently lets a role skip approval or revive
// a served order, this catches it instead of re-deriving the logic under test.
const EXPECTED_CLIENT: Record<OrderStatus, Partial<Record<OrderStatus, Role[]>>> = {
  pending: {
    confirmed: ["owner", "manager", "serveur"],
    cancelled: ["owner", "manager", "serveur"],
  },
  confirmed: { cancelled: ["owner", "manager", "serveur"] },
  preparing: { cancelled: ["owner", "manager", "serveur"] },
  ready: {
    served: ["owner", "manager", "serveur"],
    cancelled: ["owner", "manager", "serveur"],
  },
  served: {},
  cancelled: {},
};

describe("canTransition — full matrix", () => {
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      for (const role of ROLES) {
        const expected = (EXPECTED_CLIENT[from][to] ?? []).includes(role);
        it(`${role}: ${from} -> ${to} is ${expected ? "allowed" : "denied"}`, () => {
          expect(canTransition(role, from, to)).toBe(expected);
        });
      }
    }
  }
});

describe("the kitchen never writes order status directly", () => {
  it("cuisine can perform no order transition at all", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        expect(canTransition("cuisine", from, to)).toBe(false);
      }
    }
  });

  it("cuisine's allowedTransitions is empty from every state", () => {
    for (const from of ORDER_STATUSES) {
      expect(allowedTransitions("cuisine", from)).toEqual([]);
    }
  });
});

describe("system transitions are not client-writable", () => {
  it.each(SYSTEM_TRANSITIONS)("no role may write $from -> $to", ({ from, to }) => {
    for (const role of ROLES) {
      expect(canTransition(role, from, to)).toBe(false);
    }
  });

  // Drift guard against 0030_order_workflow.sql's enforce_order_transition().
  // Postgres allows the union of client + system edges; if this diverges, a
  // legal action starts failing with a 23514 (or worse, an illegal one stops).
  it("client + system transitions reproduce the database's machine", () => {
    const DB_MACHINE: Record<OrderStatus, OrderStatus[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: ["served", "cancelled"],
      served: [],
      cancelled: [],
    };

    for (const from of ORDER_STATUSES) {
      const client = ORDER_TRANSITIONS[from].map((e) => e.to);
      const system = SYSTEM_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
      expect([...client, ...system].sort()).toEqual([...DB_MACHINE[from]].sort());
    }
  });
});

describe("terminal states", () => {
  it("served and cancelled are terminal; everything else is active", () => {
    for (const status of ORDER_STATUSES) {
      const terminal = status === "served" || status === "cancelled";
      expect(isTerminal(status)).toBe(terminal);
      expect(isActive(status)).toBe(!terminal);
    }
  });

  it("no role can move an order out of a terminal state", () => {
    for (const from of ["served", "cancelled"] as OrderStatus[]) {
      for (const role of ROLES) {
        expect(allowedTransitions(role, from)).toEqual([]);
      }
    }
  });
});

describe("isInKitchen", () => {
  it("covers exactly the approved-but-not-plated window", () => {
    expect(isInKitchen("confirmed")).toBe(true);
    expect(isInKitchen("preparing")).toBe(true);
    for (const status of ["pending", "ready", "served", "cancelled"] as OrderStatus[]) {
      expect(isInKitchen(status)).toBe(false);
    }
  });
});

describe("allowedTransitions agrees with canTransition", () => {
  it("every listed target is permitted, every omitted one is not", () => {
    for (const role of ROLES) {
      for (const from of ORDER_STATUSES) {
        const allowed = allowedTransitions(role, from);
        for (const to of ORDER_STATUSES) {
          expect(canTransition(role, from, to)).toBe(allowed.includes(to));
        }
      }
    }
  });
});

describe("robustness", () => {
  it("an unknown status arriving from the database is denied, not thrown on", () => {
    const bogus = "archived" as OrderStatus;
    expect(() => canTransition("owner", bogus, "served")).not.toThrow();
    expect(canTransition("owner", bogus, "served")).toBe(false);
    expect(allowedTransitions("owner", bogus)).toEqual([]);
  });

  it("every status has a distinct label key", () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
    }
    expect(new Set(Object.values(ORDER_STATUS_LABELS)).size).toBe(ORDER_STATUSES.length);
  });

  // messages.test.ts guards fr/en parity, but neither catalogue knows this
  // constant exists. Without this, renaming a key here would silently render
  // the raw key ("statusReady") to a waiter mid-service.
  it.each([["fr", fr], ["en", en]])("every label key resolves in %s.json", (_locale, catalogue) => {
    const orders = (catalogue as { Orders: Record<string, string> }).Orders;
    for (const status of ORDER_STATUSES) {
      expect(orders[ORDER_STATUS_LABELS[status]]).toBeTruthy();
    }
  });
});
