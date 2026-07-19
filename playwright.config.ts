import { defineConfig, devices } from "@playwright/test";

// RBAC smoke suite (ROADMAP.md Phase 3, Task 3.2). Runs against a real
// server — there's no local Supabase stack in this project (migrations go
// through the hosted pooler), so this always targets a live app + live DB:
// BASE_URL defaults to the local dev server; point it at a staging
// deployment for CI. See e2e/rbac.spec.ts for credential requirements.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared seeded accounts — avoid concurrent-login races
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:4000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
