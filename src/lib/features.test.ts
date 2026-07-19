import { describe, expect, it } from "vitest";
import { applyStatusGate, PLAN_DEFAULTS, resolveFeatures, resolveFeaturesWithSource } from "./features";
import { FEATURE_KEYS } from "./types";

describe("resolveFeatures", () => {
  it("returns exactly the plan defaults when there are no overrides", () => {
    for (const plan of ["free", "pro", "enterprise"] as const) {
      expect(resolveFeatures(plan, [])).toEqual(PLAN_DEFAULTS[plan]);
    }
  });

  it("free plan has analytics/staff_management/floor_plan/promotions/inventory off by default", () => {
    const resolved = resolveFeatures("free", []);
    expect(resolved.analytics).toBe(false);
    expect(resolved.staff_management).toBe(false);
    expect(resolved.floor_plan).toBe(false);
    expect(resolved.promotions).toBe(false);
    expect(resolved.inventory).toBe(false);
    expect(resolved.online_ordering).toBe(true);
    expect(resolved.reservations).toBe(true);
    expect(resolved.menu_editor).toBe(true);
  });

  it("enterprise plan has every feature on by default", () => {
    const resolved = resolveFeatures("enterprise", []);
    for (const key of FEATURE_KEYS) {
      expect(resolved[key]).toBe(true);
    }
  });

  it("an override wins over the plan default, in either direction", () => {
    // free plan defaults inventory=false -> override to true (Super Admin grant above plan)
    const grantedAboveTier = resolveFeatures("free", [{ feature_key: "inventory", enabled: true }]);
    expect(grantedAboveTier.inventory).toBe(true);

    // enterprise plan defaults promotions=true -> override to false (Super Admin revoke)
    const revoked = resolveFeatures("enterprise", [{ feature_key: "promotions", enabled: false }]);
    expect(revoked.promotions).toBe(false);
  });

  it("multiple overrides all apply, and unrelated keys stay at plan default", () => {
    const resolved = resolveFeatures("free", [
      { feature_key: "inventory", enabled: true },
      { feature_key: "analytics", enabled: true },
    ]);
    expect(resolved.inventory).toBe(true);
    expect(resolved.analytics).toBe(true);
    expect(resolved.staff_management).toBe(false); // untouched, still plan default
  });
});

describe("applyStatusGate", () => {
  const allOn = resolveFeatures("enterprise", []);

  it("leaves features untouched for active/trial restaurants", () => {
    expect(applyStatusGate("active", allOn)).toEqual(allOn);
    expect(applyStatusGate("trial", allOn)).toEqual(allOn);
  });

  it("forces online_ordering + reservations off for suspended, regardless of plan/overrides", () => {
    const gated = applyStatusGate("suspended", allOn);
    expect(gated.online_ordering).toBe(false);
    expect(gated.reservations).toBe(false);
    // Everything else (e.g. menu_editor) is untouched — the menu stays browsable.
    expect(gated.menu_editor).toBe(true);
  });

  it("forces online_ordering + reservations off for expired trials too", () => {
    const gated = applyStatusGate("expired", allOn);
    expect(gated.online_ordering).toBe(false);
    expect(gated.reservations).toBe(false);
  });
});

describe("resolveFeaturesWithSource", () => {
  it("marks every key overridden=false when there are no overrides", () => {
    const result = resolveFeaturesWithSource("free", []);
    for (const key of FEATURE_KEYS) {
      expect(result[key].overridden).toBe(false);
      expect(result[key].enabled).toBe(PLAN_DEFAULTS.free[key]);
    }
  });

  it("marks only the overridden keys as overridden=true, with the override's value", () => {
    const result = resolveFeaturesWithSource("free", [{ feature_key: "inventory", enabled: true }]);
    expect(result.inventory).toEqual({ enabled: true, overridden: true });
    expect(result.analytics).toEqual({ enabled: false, overridden: false });
  });
});
