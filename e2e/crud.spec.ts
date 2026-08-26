import fs from "node:fs";
import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

// Playwright's test runner doesn't load .env the way `next dev` does — do it
// ourselves so NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are available for the
// direct supabase-js sign-in below. No-op (and harmless) if already set,
// e.g. by CI secrets.
for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    if (process.env[key] === undefined) {
      process.env[key] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

// CRUD smoke suite for the dashboard's API routes — one create/read/update/
// delete cycle per resource, so a broken endpoint fails here instead of
// being discovered by an owner clicking around in production.
//
// Deliberately browser-free: it drives the route handlers with Playwright's
// `request` (APIRequestContext), not `page` — a plain HTTP client with no
// Chromium dependency. The one thing a browser session buys you, the
// @supabase/ssr auth cookie, is built directly with that same package (the
// exact one the app's server client uses), so requests carry a real,
// route-handler-verified session — nothing here is mocked.
//
// Runs against a real server + live Supabase project, same constraint as
// rbac.spec.ts (see playwright.config.ts) — no local Supabase stack.
// Every resource here is reachable by "manager" (seeded by
// scripts/seed-orendezvous-team.mjs). Owner-only resources (promotions,
// events, staff, inventory categories, restaurant settings) are gated
// behind OWNER_EMAIL/OWNER_PASSWORD and skip when unset — same pattern as
// rbac.spec.ts.

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4000";
const MANAGER = { email: "manager@orendezvous.ma", password: "Manager2026!" };
const OWNER_EMAIL = process.env.OWNER_EMAIL;
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;

/** Signs in with supabase-js directly (no network round-trip through the
 * app's own /login page needed) and returns the Cookie header @supabase/ssr
 * would have written to the browser for this session. */
async function authCookie(email: string, password: string): Promise<string> {
  const jar: { name: string; value: string }[] = [];
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: (toSet) => {
          jar.push(...toSet);
        },
      },
    },
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login failed for ${email}: ${error.message}`);
  return jar.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
}

async function newSession(email: string, password: string): Promise<APIRequestContext> {
  const cookie = await authCookie(email, password);
  return playwrightRequest.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { Cookie: cookie } });
}

test.describe("Dashboard CRUD — manager", () => {
  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await newSession(MANAGER.email, MANAGER.password);
  });
  test.afterAll(async () => {
    await api.dispose();
  });

  test("categories: create, update, delete", async () => {
    const created = await api.post("/api/dashboard/categories", {
      data: { name_fr: `Test CRUD ${Date.now()}` },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id } = await created.json();

    const updated = await api.patch(`/api/dashboard/categories/${id}`, {
      data: { name_fr: "Test CRUD renamed", i18n: { en: { name: "Test CRUD EN" } } },
    });
    expect(updated.status(), await updated.text()).toBe(200);

    const deleted = await api.delete(`/api/dashboard/categories/${id}`);
    expect(deleted.status(), await deleted.text()).toBe(200);
  });

  test("items: create, update, delete", async () => {
    // Its own category (not a shared/seeded one), so this test is
    // self-contained and doesn't depend on categories being seeded with
    // RFC-4122-valid UUIDs (see the "seeded inventory categories" finding).
    const cat = await api.post("/api/dashboard/categories", {
      data: { name_fr: `Test CRUD items cat ${Date.now()}` },
    });
    expect(cat.status(), await cat.text()).toBe(201);
    const { id: categoryId } = await cat.json();

    const created = await api.post("/api/dashboard/items", {
      data: { category_id: categoryId, name_fr: "Article CRUD test", base_price: 42, in_stock: true },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id: itemId } = await created.json();

    const updated = await api.patch(`/api/dashboard/items/${itemId}`, {
      data: { in_stock: false, base_price: 45 },
    });
    expect(updated.status(), await updated.text()).toBe(200);

    const deletedItem = await api.delete(`/api/dashboard/items/${itemId}`);
    expect(deletedItem.status(), await deletedItem.text()).toBe(200);

    const deletedCat = await api.delete(`/api/dashboard/categories/${categoryId}`);
    expect(deletedCat.status(), await deletedCat.text()).toBe(200);
  });

  test("tables: create, update, delete", async () => {
    const created = await api.post("/api/dashboard/tables", {
      data: { number: `T-${Date.now() % 100000}`, seats: 4 },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { table } = await created.json();

    // `updated_at` is a required optimistic-concurrency token here (see
    // tables/[id]/route.ts) — not optional, so it's part of every PATCH.
    const updated = await api.patch(`/api/dashboard/tables/${table.id}`, {
      data: { seats: 6, updated_at: table.updated_at },
    });
    expect(updated.status(), await updated.text()).toBe(200);

    const deleted = await api.delete(`/api/dashboard/tables/${table.id}`);
    expect(deleted.status(), await deleted.text()).toBe(200);
  });

  test("inventory items: create, update (stock delta), delete", async () => {
    // Uses its own category rather than a pre-seeded one — the seed data's
    // inventory_categories carry synthetic IDs (e.g.
    // 71111111-1111-1111-1111-111111111111) whose 4th group doesn't start
    // with 8/9/a/b, so they fail zod's strict `.uuid()` (RFC 4122 variant
    // check) on inventoryItemSchema. That's real, separately-flagged
    // behavior — this test isolates it from the create/update/delete cycle.
    const cat = await api.post("/api/dashboard/inventory/categories", {
      data: { name: `Test CRUD inv cat ${Date.now()}` },
    });
    if (cat.status() === 403) {
      test.skip(true, "inventory categories POST is owner-only (requireOwner) — run with OWNER_* to cover this");
    }
    expect(cat.status(), await cat.text()).toBe(201);
    const catBody = await cat.json();
    const categoryId = catBody.category?.id ?? catBody.id;

    const created = await api.post("/api/dashboard/inventory", {
      data: { category_id: categoryId, name: "Ingrédient CRUD test", unit: "kg", stock: 10, min_threshold: 2 },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { item } = await created.json();

    const updated = await api.patch(`/api/dashboard/inventory/${item.id}`, { data: { delta: 5 } });
    expect(updated.status(), await updated.text()).toBe(200);

    const deleted = await api.delete(`/api/dashboard/inventory/${item.id}`);
    expect(deleted.status(), await deleted.text()).toBe(200);
  });

  test("reservations: read list, update status", async () => {
    // No dashboard-side create (public visitors create these via
    // /api/reservations) — seed one through that public endpoint first.
    const publicCreate = await api.post("/api/reservations", {
      data: {
        restaurant_slug: "orendezvous",
        customer_name: "CRUD Test",
        customer_phone: "0612345678",
        date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        time: "20:00",
        party_size: 2,
      },
    });
    expect(publicCreate.status(), await publicCreate.text()).toBe(201);
    const { id } = await publicCreate.json();

    const list = await api.get("/api/dashboard/reservations");
    expect(list.status(), await list.text()).toBe(200);

    const updated = await api.patch(`/api/dashboard/reservations/${id}`, { data: { status: "confirmed" } });
    expect(updated.status(), await updated.text()).toBe(200);
  });

  test("orders: create (dine-in), walk the workflow, delete", async () => {
    const menu = await api.get("/api/dashboard/menu");
    const { items } = await menu.json();
    const item = (items as { id: string; in_stock: boolean }[]).find((i) => i.in_stock);
    expect(item, "seeded restaurant should have an in-stock item").toBeTruthy();

    const created = await api.post("/api/dashboard/orders", {
      data: { type: "dine_in", table_number: "T1", lines: [{ item_id: item!.id, quantity: 1, options: [] }] },
    });
    // The RLS insert policy this used to fail on landed in 0027.
    expect(created.status(), await created.text()).toBe(201);
    if (created.status() === 201) {
      const { id } = await created.json();

      // A POS order is approved by the act of being typed in, so 0030's
      // trigger has already fanned it out and moved it to 'preparing'.
      const fetched = await api.get(`/api/dashboard/orders`);
      const { orders } = await fetched.json();
      const mine = (orders as { id: string; status: string }[]).find((o) => o.id === id);
      expect(mine?.status, "POS order should be approved on arrival").toBe("preparing");

      // The state machine is the gate now, not just the role: 'preparing' has
      // no path to 'served' — the kitchen has to bump its tickets first.
      const illegal = await api.patch(`/api/dashboard/orders/${id}`, { data: { status: "served" } });
      expect(illegal.status(), await illegal.text()).toBe(403);

      // Cancelling out of 'preparing' is legal for this role.
      const cancelled = await api.patch(`/api/dashboard/orders/${id}`, { data: { status: "cancelled" } });
      expect(cancelled.status(), await cancelled.text()).toBe(200);

      const deleted = await api.delete(`/api/dashboard/orders/${id}`);
      expect(deleted.status(), await deleted.text()).toBe(200);
    }
  });
});

test.describe("Dashboard CRUD — owner-only resources", () => {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, "OWNER_EMAIL/OWNER_PASSWORD not set — skipping owner-only CRUD");

  let api: APIRequestContext;
  test.beforeAll(async () => {
    api = await newSession(OWNER_EMAIL!, OWNER_PASSWORD!);
  });
  test.afterAll(async () => {
    await api.dispose();
  });

  test("promotions: create, update, delete", async () => {
    const menu = await api.get("/api/dashboard/menu");
    const { categories } = await menu.json();
    const categoryId = categories[0]?.id;
    expect(categoryId).toBeTruthy();

    const created = await api.post("/api/dashboard/promotions", {
      data: { name: "Formule CRUD test", price: 99, active: true, rules: [{ category_id: categoryId, count: 1 }] },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id } = await created.json();

    const updated = await api.patch(`/api/dashboard/promotions/${id}`, { data: { active: false } });
    expect(updated.status(), await updated.text()).toBe(200);

    const deleted = await api.delete(`/api/dashboard/promotions/${id}`);
    expect(deleted.status(), await deleted.text()).toBe(200);
  });

  test("events: create, update, delete", async () => {
    const created = await api.post("/api/dashboard/events", {
      data: {
        title: "Soirée CRUD test",
        category: "live_music",
        status: "upcoming",
        start_date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        is_free_entry: true,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id } = await created.json();

    const updated = await api.patch(`/api/dashboard/events/${id}`, { data: { status: "sold_out" } });
    expect(updated.status(), await updated.text()).toBe(200);

    const deleted = await api.delete(`/api/dashboard/events/${id}`);
    expect(deleted.status(), await deleted.text()).toBe(200);
  });

  test("inventory categories: create", async () => {
    // No DELETE route exists for inventory categories — documenting that
    // rather than working around it; create-only is the real coverage.
    const created = await api.post("/api/dashboard/inventory/categories", {
      data: { name: `Catégorie CRUD test ${Date.now()}` },
    });
    expect(created.status(), await created.text()).toBe(201);
  });

  test("staff: invite, update role, remove", async () => {
    const email = `crud-test-${Date.now()}@orendezvous.ma`;
    const created = await api.post("/api/dashboard/staff", {
      data: { email, password: "TempPass2026!", role: "serveur", consent: true },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id } = await created.json();

    const updated = await api.patch(`/api/dashboard/staff/${id}`, { data: { role: "cuisine" } });
    expect(updated.status(), await updated.text()).toBe(200);

    const deleted = await api.delete(`/api/dashboard/staff/${id}`);
    expect(deleted.status(), await deleted.text()).toBe(200);
  });

  test("restaurant settings: update", async () => {
    const updated = await api.patch("/api/dashboard/restaurant", {
      data: { hours: "Lun-Dim 11h-23h", base_delivery_fee: 15, is_dine_in_enabled: true, is_delivery_enabled: true },
    });
    expect(updated.status(), await updated.text()).toBe(200);
  });
});
