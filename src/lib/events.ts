import type { EventCategory, EventStatus, EventInquiry, RestaurantEvent } from "@/lib/types";

// Message keys into the Labels.* namespace, not display text — resolve them
// with a translator at the call site (the public site has its own Events.*
// category keys and does not use these).

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  live_music: "eventCategoryLiveMusic",
  theme_night: "eventCategoryThemeNight",
  tasting: "eventCategoryTasting",
  dj_set: "eventCategoryDjSet",
  special_menu: "eventCategorySpecialMenu",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "eventStatusUpcoming",
  sold_out: "eventStatusSoldOut",
  cancelled: "eventStatusCancelled",
  completed: "eventStatusCompleted",
};

export const EVENT_TYPE_LABELS: Record<EventInquiry["event_type"], string> = {
  birthday: "inquiryBirthday",
  corporate: "inquiryCorporate",
  wedding: "inquiryWedding",
  privatization: "inquiryPrivatization",
  other: "inquiryOther",
};

export const TIME_SLOT_LABELS: Record<NonNullable<EventInquiry["preferred_time_slot"]>, string> = {
  lunch: "slotLunch",
  evening: "slotEvening",
  full_day: "slotFullDay",
};

export const INQUIRY_STATUS_LABELS: Record<EventInquiry["status"], string> = {
  pending: "inquiryPending",
  contacted: "inquiryContacted",
  approved: "inquiryApproved",
  rejected: "inquiryRejected",
};

/** A public event is fully booked when its seats are exhausted or it's marked sold out. */
export function isFullyBooked(e: Pick<RestaurantEvent, "status" | "max_seats" | "reserved_seats">): boolean {
  if (e.status === "sold_out") return true;
  return e.max_seats != null && e.max_seats > 0 && e.reserved_seats >= e.max_seats;
}
