import type { Reservation } from "@/lib/types";
import type { OrderStatus } from "@/lib/order-flow";

export const ORDER_STATUS_DOT: Record<OrderStatus, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-blue-400",
  preparing: "bg-blue-400",
  ready: "bg-orange-400",
  served: "bg-emerald-500",
  cancelled: "bg-neutral-300",
};

export const RESERVATION_STATUS_DOT: Record<Reservation["status"], string> = {
  new: "bg-amber-400",
  confirmed: "bg-emerald-500",
  declined: "bg-neutral-300",
};
