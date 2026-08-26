// Single source of truth for the order lifecycle state machine (see
// order-workflow-Plan.md §3). Pure and dependency-free — apart from the Role
// type — so it is safe to import from API routes, server components and client
// components alike, exactly like its sibling permissions.ts.
//
// This module mirrors 0030_order_workflow.sql. The database enforces the same
// machine in enforce_order_transition(); if the two ever disagree, Postgres
// wins and the client gets a 23514. Change both together.

import type { Role } from "@/lib/permissions";

export type OrderStatus =
  | "pending"    // customer submitted from the QR menu, awaiting a waiter
  | "confirmed"  // waiter approved — transient, the trigger advances it
  | "preparing"  // on the kitchen display, station tickets exist
  | "ready"      // every station bumped its ticket
  | "served"     // waiter delivered it to the table
  | "cancelled"; // rejected before or during prep (item 86'd, customer left)

// A readonly tuple, not OrderStatus[], so zod schemas can derive their enum
// straight from it (z.enum needs literal members) instead of restating the
// union and drifting from it.
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const satisfies readonly OrderStatus[];

/** States an order can never leave. */
const TERMINAL_STATUSES: OrderStatus[] = ["served", "cancelled"];

// Message keys into the Orders.* namespace, not display text — same convention
// as ROLE_LABELS in permissions.ts.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "statusPending",
  confirmed: "statusConfirmed",
  preparing: "statusPreparing",
  ready: "statusReady",
  served: "statusServed",
  cancelled: "statusCancelled",
};

/**
 * Transitions a signed-in human may perform, keyed by the state they start
 * from. This is deliberately a SUBSET of the machine in 0030 — the two
 * transitions the database also allows, `confirmed → preparing` and
 * `preparing → ready`, are performed by triggers and must never be written by
 * a client. See SYSTEM_TRANSITIONS below.
 *
 * `cuisine` appears nowhere here, and that is the point: the kitchen's "Mark
 * as Ready" is a bump on kds_tickets, not a write to orders. The order's own
 * status is derived from those tickets by sync_order_ready_from_tickets().
 */
export const ORDER_TRANSITIONS: Record<
  OrderStatus,
  { to: OrderStatus; roles: Role[] }[]
> = {
  pending: [
    { to: "confirmed", roles: ["owner", "manager", "serveur"] },
    { to: "cancelled", roles: ["owner", "manager", "serveur"] },
  ],
  // Transient — an order only sits here for the duration of one transaction.
  // Cancellation is still listed because a crashed trigger could strand one.
  confirmed: [{ to: "cancelled", roles: ["owner", "manager", "serveur"] }],
  preparing: [{ to: "cancelled", roles: ["owner", "manager", "serveur"] }],
  ready: [
    { to: "served", roles: ["owner", "manager", "serveur"] },
    { to: "cancelled", roles: ["owner", "manager", "serveur"] },
  ],
  served: [],
  cancelled: [],
};

/**
 * The two transitions Postgres performs on its own (0030 §4 and §6). Exported
 * so the test suite can assert that client + system transitions together
 * reproduce the database's machine, and so nothing re-implements them by hand.
 */
export const SYSTEM_TRANSITIONS: { from: OrderStatus; to: OrderStatus }[] = [
  { from: "confirmed", to: "preparing" }, // fan_order_to_kds
  { from: "preparing", to: "ready" },     // sync_order_ready_from_tickets
];

export function canTransition(
  role: Role,
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  // `from` may arrive from the database as an arbitrary string.
  const edges = ORDER_TRANSITIONS[from] ?? [];
  return edges.some((edge) => edge.to === to && edge.roles.includes(role));
}

/** Every state `role` may move an order in `from` to — drives the action buttons. */
export function allowedTransitions(role: Role, from: OrderStatus): OrderStatus[] {
  const edges = ORDER_TRANSITIONS[from] ?? [];
  return edges.filter((edge) => edge.roles.includes(role)).map((edge) => edge.to);
}

/** Served or cancelled — the order is closed and off the floor. */
export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Still needs someone's attention. The inverse of isTerminal. */
export function isActive(status: OrderStatus): boolean {
  return !isTerminal(status);
}

/** In the kitchen's hands — approved, not yet plated. */
export function isInKitchen(status: OrderStatus): boolean {
  return status === "confirmed" || status === "preparing";
}
