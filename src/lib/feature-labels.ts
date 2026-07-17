import type { FeatureKey } from "@/lib/types";

// Plain data (no "server-only") — used by both server and client components.
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  online_ordering: "Commande en ligne",
  reservations: "Réservations",
  analytics: "Statistiques",
  staff_management: "Gestion du personnel",
  menu_editor: "Éditeur de menu",
  floor_plan: "Plan de salle",
  promotions: "Promotions",
  inventory: "Inventaire",
};
