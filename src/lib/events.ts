import type { EventCategory, EventStatus, EventInquiry, RestaurantEvent } from "@/lib/types";

// Shared display labels for the events feature (dashboard + public site).

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  live_music: "Musique live",
  theme_night: "Soirée à thème",
  tasting: "Dégustation",
  dj_set: "DJ set",
  special_menu: "Menu spécial",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "À venir",
  sold_out: "Complet",
  cancelled: "Annulé",
  completed: "Terminé",
};

export const EVENT_TYPE_LABELS: Record<EventInquiry["event_type"], string> = {
  birthday: "Anniversaire",
  corporate: "Entreprise",
  wedding: "Mariage",
  privatization: "Privatisation",
  other: "Autre",
};

export const TIME_SLOT_LABELS: Record<NonNullable<EventInquiry["preferred_time_slot"]>, string> = {
  lunch: "Déjeuner",
  evening: "Soirée",
  full_day: "Journée complète",
};

export const INQUIRY_STATUS_LABELS: Record<EventInquiry["status"], string> = {
  pending: "En attente",
  contacted: "Contacté",
  approved: "Approuvé",
  rejected: "Refusé",
};

/** A public event is fully booked when its seats are exhausted or it's marked sold out. */
export function isFullyBooked(e: Pick<RestaurantEvent, "status" | "max_seats" | "reserved_seats">): boolean {
  if (e.status === "sold_out") return true;
  return e.max_seats != null && e.max_seats > 0 && e.reserved_seats >= e.max_seats;
}
