import { test, expect, type Page } from "@playwright/test";

// RBAC smoke suite (ROADMAP.md Phase 3, Task 3.2). Runs against a real
// server + live Supabase project — see playwright.config.ts for why (no
// local Supabase stack in this project).
//
// manager@/serveur@/cuisine@orendezvous.ma were seeded by
// scripts/seed-orendezvous-team.mjs with must_change_password=true, so
// EVERY run through this suite exercises the forced-password-change flow on
// first login — that's deliberate, not incidental: it's the exact flow that
// had a Next 16 dev-mode profiler bug (double-redirect chain), fixed in
// src/app/login/page.tsx, src/app/change-password/page.tsx and
// src/proxy.ts. If these accounts get their password rotated by a real run,
// update TEAM_CREDENTIALS below (or re-run the seed script, which is
// idempotent).
//
// Owner/super-admin credentials aren't known test-only values (the owner
// account predates this suite) — set OWNER_EMAIL/OWNER_PASSWORD and
// SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD to include those in the run;
// their describe blocks skip automatically when unset.

const TEAM_CREDENTIALS = {
  manager: { email: "manager@orendezvous.ma", password: "Manager2026!" },
  serveur: { email: "serveur@orendezvous.ma", password: "Serveur2026!" },
  cuisine: { email: "cuisine@orendezvous.ma", password: "Cuisine2026!" },
} as const;

const ROUTE_MATRIX: Record<string, ("manager" | "serveur" | "cuisine")[]> = {
  "/dashboard": ["manager"],
  "/dashboard/kds": ["manager", "serveur", "cuisine"],
  "/dashboard/orders": ["manager", "serveur", "cuisine"],
  "/dashboard/reservations": ["manager", "serveur"],
  "/dashboard/menu": ["manager", "serveur", "cuisine"],
  "/dashboard/tables": ["manager", "serveur"],
  "/dashboard/inventory": ["manager", "cuisine"],
  "/dashboard/customers": ["manager"],
  "/dashboard/analytics": [],
  "/dashboard/settings": [],
  "/dashboard/team": [],
};

const DEFAULT_ROUTE: Record<"manager" | "serveur" | "cuisine", string> = {
  manager: "/dashboard",
  serveur: "/dashboard/orders",
  cuisine: "/dashboard/kds",
};

/**
 * Logs in and clears the forced password-change screen if it appears
 * (always does, for these seed accounts, on a freshly-provisioned DB — but
 * this is idempotent: if a previous run already cleared the flag, the login
 * lands directly on the dashboard and this is a no-op).
 */
async function loginAndClearForcedPasswordChange(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await page.waitForURL(/\/(change-password|dashboard)/, { timeout: 15_000 });

  if (page.url().includes("/change-password")) {
    await page.locator("#password").fill(password);
    await page.locator("#confirm").fill(password);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  }
}

for (const [role, creds] of Object.entries(TEAM_CREDENTIALS)) {
  test.describe(`RBAC — ${role}`, () => {
    test(`${role} lands on ${DEFAULT_ROUTE[role as keyof typeof DEFAULT_ROUTE]} after login`, async ({ page }) => {
      await loginAndClearForcedPasswordChange(page, creds.email, creds.password);
      await expect(page).toHaveURL(new RegExp(`${DEFAULT_ROUTE[role as keyof typeof DEFAULT_ROUTE]}$`));
    });

    for (const [route, allowedRoles] of Object.entries(ROUTE_MATRIX)) {
      const allowed = allowedRoles.includes(role as "manager" | "serveur" | "cuisine");

      test(`${role} ${allowed ? "can render" : "is redirected away from"} ${route}`, async ({ page }) => {
        await loginAndClearForcedPasswordChange(page, creds.email, creds.password);
        await page.goto(route);
        await page.waitForLoadState("networkidle");

        if (allowed) {
          await expect(page).toHaveURL(new RegExp(`${route}$`));
        } else {
          const expectedLanding = DEFAULT_ROUTE[role as keyof typeof DEFAULT_ROUTE];
          await expect(page).toHaveURL(new RegExp(`${expectedLanding}$`));
        }
      });
    }
  });
}

const ownerEmail = process.env.OWNER_EMAIL;
const ownerPassword = process.env.OWNER_PASSWORD;

test.describe("RBAC — owner", () => {
  test.skip(!ownerEmail || !ownerPassword, "OWNER_EMAIL/OWNER_PASSWORD not set — see file header");

  test("owner can reach every /dashboard/* route in the matrix", async ({ page }) => {
    await loginAndClearForcedPasswordChange(page, ownerEmail!, ownerPassword!);
    for (const route of Object.keys(ROUTE_MATRIX)) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(new RegExp(`${route}$`));
    }
  });
});

const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

test.describe("RBAC — super admin", () => {
  test.skip(
    !superAdminEmail || !superAdminPassword,
    "SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD not set — see file header",
  );

  test("super admin can reach /admin and every /admin/* section", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(superAdminEmail!);
    await page.locator("#password").fill(superAdminPassword!);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/admin/, { timeout: 15_000 });

    for (const path of ["/admin", "/admin/restaurants", "/admin/subscriptions", "/admin/permissions"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test("a non-admin session is bounced away from /admin", async ({ page }) => {
    await loginAndClearForcedPasswordChange(page, TEAM_CREDENTIALS.manager.email, TEAM_CREDENTIALS.manager.password);
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
