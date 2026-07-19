import { describe, expect, it } from "vitest";
import { canAccessRoute, canWrite, defaultRouteFor, ROLES, type Role } from "./permissions";

// Hardcoded expected matrix (independent of ROUTE_ACCESS's internal
// representation) — this is the regression guard: if someone edits
// ROUTE_ACCESS and silently changes who can see a route, this test catches
// it instead of only re-deriving the same logic under test.
const EXPECTED_ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard": ["owner", "manager"],
  "/dashboard/orders": ["owner", "manager", "serveur", "cuisine"],
  "/dashboard/reservations": ["owner", "manager", "serveur"],
  "/dashboard/menu": ["owner", "manager", "serveur", "cuisine"],
  "/dashboard/tables": ["owner", "manager", "serveur"],
  "/dashboard/inventory": ["owner", "manager", "cuisine"],
  "/dashboard/customers": ["owner", "manager"],
  "/dashboard/analytics": ["owner"],
  "/dashboard/settings": ["owner"],
  "/dashboard/team": ["owner"],
};

describe("canAccessRoute — full matrix", () => {
  for (const [route, allowedRoles] of Object.entries(EXPECTED_ROUTE_ACCESS)) {
    for (const role of ROLES) {
      const expected = allowedRoles.includes(role);
      it(`${role} ${expected ? "can" : "cannot"} access ${route}`, () => {
        expect(canAccessRoute(role, route)).toBe(expected);
      });
    }
  }

  it("treats unlisted dashboard routes as unrestricted (fail-open by design)", () => {
    expect(canAccessRoute("cuisine", "/dashboard/some-new-page")).toBe(true);
  });

  it("prefix matching doesn't leak e.g. /dashboard into /dashboard/orders's rule", () => {
    // /dashboard is exact-matched (owner/manager only); /dashboard/orders
    // must NOT inherit that restriction just because it starts with
    // "/dashboard" — the more specific rule must win.
    expect(canAccessRoute("serveur", "/dashboard")).toBe(false);
    expect(canAccessRoute("serveur", "/dashboard/orders")).toBe(true);
  });
});

describe("canWrite", () => {
  it("owner and manager can write menu/inventory/tables", () => {
    for (const role of ["owner", "manager"] as Role[]) {
      expect(canWrite(role, "menu")).toBe(true);
      expect(canWrite(role, "inventory")).toBe(true);
      expect(canWrite(role, "tables")).toBe(true);
    }
  });
  it("serveur and cuisine cannot write menu/inventory/tables", () => {
    for (const role of ["serveur", "cuisine"] as Role[]) {
      expect(canWrite(role, "menu")).toBe(false);
      expect(canWrite(role, "inventory")).toBe(false);
      expect(canWrite(role, "tables")).toBe(false);
    }
  });
  it("all four roles can write orders", () => {
    for (const role of ROLES) {
      expect(canWrite(role, "orders")).toBe(true);
    }
  });
  it("cuisine cannot write reservations, but owner/manager/serveur can", () => {
    expect(canWrite("cuisine", "reservations")).toBe(false);
    expect(canWrite("owner", "reservations")).toBe(true);
    expect(canWrite("manager", "reservations")).toBe(true);
    expect(canWrite("serveur", "reservations")).toBe(true);
  });
  it("nobody can write customers or analytics (read-only resources)", () => {
    for (const role of ROLES) {
      expect(canWrite(role, "customers")).toBe(false);
      expect(canWrite(role, "analytics")).toBe(false);
    }
  });
  it("only owner can write team/settings", () => {
    for (const role of ROLES) {
      expect(canWrite(role, "team")).toBe(role === "owner");
      expect(canWrite(role, "settings")).toBe(role === "owner");
    }
  });
});

describe("defaultRouteFor", () => {
  it("owner and manager land on /dashboard", () => {
    expect(defaultRouteFor("owner")).toBe("/dashboard");
    expect(defaultRouteFor("manager")).toBe("/dashboard");
  });
  it("serveur and cuisine land on /dashboard/orders (their Aperçu is hidden)", () => {
    expect(defaultRouteFor("serveur")).toBe("/dashboard/orders");
    expect(defaultRouteFor("cuisine")).toBe("/dashboard/orders");
  });
  it("every role's default route is itself accessible to that role (no redirect loops)", () => {
    for (const role of ROLES) {
      expect(canAccessRoute(role, defaultRouteFor(role))).toBe(true);
    }
  });
});
