import "server-only";
import {
  FEATURE_KEYS,
  type FeatureKey,
  type Plan,
  type RestaurantFeature,
  type RestaurantStatus,
} from "@/lib/types";

// Single source of truth for what each plan includes by default. Per-
// restaurant rows in restaurant_features are overrides on top of this map.
export const PLAN_DEFAULTS: Record<Plan, Record<FeatureKey, boolean>> = {
  free: {
    online_ordering: true,
    reservations: true,
    menu_editor: true,
    analytics: false,
    staff_management: false,
    floor_plan: false,
    promotions: false,
  },
  pro: {
    online_ordering: true,
    reservations: true,
    menu_editor: true,
    analytics: true,
    staff_management: true,
    floor_plan: true,
    promotions: false,
  },
  enterprise: {
    online_ordering: true,
    reservations: true,
    menu_editor: true,
    analytics: true,
    staff_management: true,
    floor_plan: true,
    promotions: true,
  },
};

/** Merges plan defaults with per-restaurant overrides — overrides win. */
export function resolveFeatures(
  plan: Plan,
  overrides: Pick<RestaurantFeature, "feature_key" | "enabled">[],
): Record<FeatureKey, boolean> {
  const resolved = { ...PLAN_DEFAULTS[plan] };
  for (const o of overrides) {
    resolved[o.feature_key] = o.enabled;
  }
  return resolved;
}

/**
 * Suspended/expired status beats plan/overrides for the public site: a
 * suspended restaurant's site is fully unavailable, and an expired trial's
 * menu stays browsable but ordering/reservations force off regardless of
 * what feature rows say. Dashboard access for both statuses is blocked
 * entirely at the guard level (src/lib/dashboard.ts), not by this map.
 */
export function applyStatusGate(
  status: RestaurantStatus,
  features: Record<FeatureKey, boolean>,
): Record<FeatureKey, boolean> {
  if (status === "expired" || status === "suspended") {
    return { ...features, online_ordering: false, reservations: false };
  }
  return features;
}

/** Marks which keys in the resolved map come from an override vs. the plan default. */
export function resolveFeaturesWithSource(
  plan: Plan,
  overrides: Pick<RestaurantFeature, "feature_key" | "enabled">[],
): Record<FeatureKey, { enabled: boolean; overridden: boolean }> {
  const overrideMap = new Map(overrides.map((o) => [o.feature_key, o.enabled]));
  const result = {} as Record<FeatureKey, { enabled: boolean; overridden: boolean }>;
  for (const key of FEATURE_KEYS) {
    const override = overrideMap.get(key);
    result[key] =
      override === undefined
        ? { enabled: PLAN_DEFAULTS[plan][key], overridden: false }
        : { enabled: override, overridden: true };
  }
  return result;
}
