import type { FeatureKey } from "@/lib/types";

// Message keys into the Labels.* namespace, not display text — resolve with
// `useTranslations("Labels")` / `getTranslations("Labels")` at the call site.
// Plain data (no "server-only") — used by both server and client components.
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  online_ordering: "featureOnlineOrdering",
  reservations: "featureReservations",
  analytics: "featureAnalytics",
  staff_management: "featureStaffManagement",
  menu_editor: "featureMenuEditor",
  floor_plan: "featureFloorPlan",
  promotions: "featurePromotions",
  inventory: "featureInventory",
  recipes: "featureRecipes",
  kds: "featureKds",
  events: "featureEvents",
};
