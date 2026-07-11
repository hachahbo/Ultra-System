import type { Order, Reservation } from "@/lib/types";

export const ORDER_STATUS_DOT: Record<Order["status"], string> = {
  new: "bg-amber-400",
  preparing: "bg-blue-400",
  done: "bg-emerald-500",
};

export const RESERVATION_STATUS_DOT: Record<Reservation["status"], string> = {
  new: "bg-amber-400",
  confirmed: "bg-emerald-500",
  declined: "bg-neutral-300",
};
