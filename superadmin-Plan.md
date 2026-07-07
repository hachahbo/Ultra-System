# Darna Super Admin Platform Layer — Enhanced Master Plan

## Context — what this plan replaces and why

The original "Master Build Prompt" assumed a greenfield Express + Prisma + Redis + Vite/React-Router
stack. **That is not this project.** Darna is an existing, working multi-tenant restaurant SaaS:

- **Next.js 16 App Router** (breaking changes vs. training data — read `node_modules/next/dist/docs/`
  before writing any route/caching code), TypeScript, Tailwind v4, shadcn/ui, TanStack Query,
  RHF + zod, framer-motion, recharts, sonner. French UI, mobile-first public site, desktop-first admin.
- **Supabase**: Postgres + Auth + RLS + Storage. Tenant isolation is already enforced by RLS via
  `my_restaurant_id()` / `my_role()` security-definer helpers (`supabase/migrations/0001_init.sql`).
- **Already built and working** (dashboard-Plan.md, commits `ef2b773`, `14b0106`): public tenant site
  at `/[slug]` (menu, cart, ordering, reservations), full Owner dashboard at `/dashboard/*`
  (kitchen/orders, reservations, menu CRUD, customers + CSV, staff management, floor plan/tables + QR,
  analytics, settings, forced password change), guards `getSessionContext()` / `requireOwner()` /
  `requireSession()` in `src/lib/dashboard.ts`, service-role client in `src/lib/supabase/admin.ts`,
  session middleware in `src/proxy.ts`.

So **§B ("Restaurant Owner Dashboard") of the original prompt is done — do not rebuild it.**
What's missing is the platform layer on top: the **Super Admin** who manages every restaurant,
plans/subscriptions, feature permissions, and an aggregated dashboard. That is this plan.

Stack mapping from the original prompt (authoritative — do not reintroduce the old stack):

| Original prompt | This project |
|---|---|
| Express/Fastify controllers | Next.js route handlers under `src/app/api/admin/*` |
| Prisma `schema.prisma` | SQL migration `supabase/migrations/0003_super_admin.sql` + RLS |
| JWT with separate admin scope | Supabase Auth + `platform_admins` table + `requireSuperAdmin()` guard |
| Redis session/list cache | Not needed at pilot scale; Next.js caching + `revalidateTag` where useful |
| Stripe subscriptions | **Provider-agnostic billing** (see Phase 3 — Stripe does not onboard Moroccan merchants; pilot bills manually in MAD) |
| Vite + React Router + new component library | `/admin` route group in the same Next app, reusing shadcn + existing dashboard components/patterns |
| New `Order` model | Existing `orders` table (already has `total`, `restaurant_id` indexes) |
| `POST /auth/register` self-serve signup | Super-admin-driven onboarding (create restaurant + owner account), reusing the staff-creation pattern |

Two unchanged hard rules from the original prompt:
- **Tenant isolation** — no restaurant ever sees another restaurant's data. Already enforced by RLS;
  every new admin route uses the service-role client and therefore must be super-admin-gated.
- **Permission control** — Super Admin can toggle any feature per restaurant, individually or in bulk.

---

## Phase 0 — Migration `0003_super_admin.sql`, types, guards

### Schema (SQL, not Prisma)

- **`public.platform_admins`** — `user_id uuid pk references auth.users on delete cascade`,
  `created_at`. Deliberately a separate table instead of a `super_admin` role on `profiles`:
  `profiles.restaurant_id` stays `not null`, the existing `my_restaurant_id()`/`my_role()` helpers and
  every existing RLS policy remain untouched, and tenant policies fail closed for admins (admin access
  goes exclusively through the service-role client + guard, mirroring the existing
  `requireOwner()` + `createAdminClient()` pattern).
- Helper `public.is_super_admin() returns boolean` — `security definer`, checks
  `exists(select 1 from platform_admins where user_id = auth.uid())`. RLS on `platform_admins`:
  select own row only; no insert/update/delete policies (managed via SQL / service role only).
- **`restaurants`** — add columns:
  - `plan text not null default 'free' check (plan in ('free','pro','enterprise'))`
  - `status text not null default 'active' check (status in ('active','trial','suspended','expired'))`
  - `city text` (backfill `'Tanger'` for the pilot row), `updated_at timestamptz not null default now()`
- **`public.subscriptions`** — `id uuid pk`, `restaurant_id uuid not null unique references restaurants
  on delete cascade`, `plan_tier text` (same check), `status text check (status in
  ('active','trialing','past_due','canceled'))`, `billing_cycle text check (in ('monthly','yearly'))`,
  `price_mad numeric(10,2) not null default 0` (MRR derives from this: yearly → `/12`),
  `trial_ends_at timestamptz`, `current_period_end timestamptz`,
  `provider text not null default 'manual' check (provider in ('manual','stripe'))`,
  `provider_customer_id text`, `provider_subscription_id text`, `notes text`, timestamps.
  One row per restaurant (the `unique` makes upsert trivial). RLS: owner may `select` their own row
  (`restaurant_id = my_restaurant_id()`), no tenant writes.
- **`public.restaurant_features`** — `id uuid pk`, `restaurant_id uuid not null references restaurants
  on delete cascade`, `feature_key text not null check (feature_key in ('online_ordering',
  'reservations','analytics','staff_management','menu_editor','floor_plan','promotions'))`,
  `enabled boolean not null`, `updated_at`, **`unique (restaurant_id, feature_key)`**,
  index on `restaurant_id`. RLS: tenant `select` own rows (owners *and* staff — nav gating needs it);
  no tenant writes. Rows are **overrides**; absence of a row = plan default (see Phase 2).
- **`public.audit_logs`** — `id uuid pk`, `admin_id uuid not null references auth.users`,
  `action text not null` (e.g. `restaurant.suspend`, `permission.toggle`, `permissions.bulk`,
  `plan.change`, `restaurant.create`, `owner.reset_password`), `target_restaurant_id uuid
  references restaurants on delete set null`, `metadata jsonb not null default '{}'`, `created_at`.
  Index `(target_restaurant_id, created_at desc)` and `(created_at desc)`. RLS: **no policies at all**
  (service-role only — admins read it through the admin API, tenants never see it).
- Reuse the `updated_at := now()` trigger pattern from `0002` for `restaurants`, `subscriptions`,
  `restaurant_features`.
- Seed additions (`supabase/seed.sql`): 4 more restaurants with varied `plan`/`status`/`city` +
  a few orders each so the admin Overview charts aren't empty; a `subscriptions` row per restaurant;
  README note for creating the super-admin auth user and inserting their `platform_admins` row
  (same style as the existing owner-account note).

### Types, schemas, guards

- `src/lib/types.ts`: extend `Restaurant` with `plan/status/city`; add `Subscription`,
  `RestaurantFeature`, `AuditLog`, and `FeatureKey` union + `FEATURE_KEYS` const array (single source
  of truth, mirrored by the SQL check).
- `src/lib/schemas.ts`: `planSchema`, `restaurantStatusSchema`, `subscriptionSchema`,
  `permissionToggleSchema { featureKey, enabled }`,
  `bulkPermissionsSchema { restaurantIds: uuid[] (min 1, max 100), changes: { featureKey, enabled }[] }`,
  `createRestaurantSchema { name, slug, city, plan, ownerEmail, ownerPassword min 8 }`.
- `src/lib/admin-auth.ts`: `requireSuperAdmin()` — same shape as `requireOwner()`
  (`{ ctx } | { response }`): resolve `auth.getUser()` with the session client, check membership in
  `platform_admins` **with the service-role client** (table has no RLS select-any policy), 401/403 JSON
  errors. **Rule (extends the existing one in `dashboard.ts`): every route under `api/admin/*` calls
  `requireSuperAdmin()` first; they all use `createAdminClient()` and this guard is their only boundary.**
- `src/lib/audit.ts`: `logAdminAction(adminId, action, targetRestaurantId, metadata)` — awaited insert
  via service role; called by **every** mutating admin route. Failure to write the log fails the request
  (surface it — an unauditable admin action is worse than a retried one).
- `src/proxy.ts`: add `/admin/:path*` to the matcher; unauthenticated → `/login?next=/admin`.
  Role-based blocking (tenant user hitting `/admin`, admin hitting `/dashboard`) lives in the **server
  layouts**, not middleware — same reasoning as the existing `must_change_password` gotcha: middleware
  is a convenience redirect, the layout + route guards are the enforcement.

**Verification:** migration applies on a db reset; existing owner/staff logins still work; tenant user
selecting from `audit_logs`/`platform_admins` gets zero rows; owner can select own `subscriptions` and
`restaurant_features` rows but cannot update them.

---

## Phase 1 — Admin shell, auth flow, Overview

- `src/app/admin/layout.tsx` (server): `getUser()` → not super admin → `redirect("/dashboard")`
  (tenant users) or `/login`. Renders the admin shell: **dark left sidebar** (Vue d'ensemble,
  Restaurants, Abonnements, Permissions, Journal d'audit, Réglages), top header with global search +
  avatar. Desktop-first 1440px, responsive down to mobile (sidebar collapses to a sheet — reuse the
  pattern from `src/components/dashboard/nav.tsx` rather than inventing a second nav system).
  New `src/components/admin/` directory; reuse shadcn primitives and the chart wrappers already used
  by `analytics-view.tsx`. Keep the UI French like the rest of the product.
- Login: reuse `/login`. On success, if the user is a platform admin route to `/admin`, else
  `/dashboard` (small server check on the redirect target; no separate login page).
- `GET /api/admin/analytics` (route handler): totals — restaurant count by status, active
  subscriptions, **MRR = Σ normalized `price_mad`** of active/trialing subscriptions, total orders +
  revenue (Σ `orders.total`) across all tenants, revenue-over-time series (day-bucketed via the
  existing `src/lib/time.ts` Casablanca helpers — **same timezone rule as dashboard-Plan.md A0.2**),
  plan-distribution counts. Pilot scale: aggregate in TS with explicit `.limit(10000)`
  (Supabase defaults to 1000 — known gotcha), keep the JSON contract stable so it can become an RPC later.
- `src/app/admin/page.tsx` — Overview: 4 KPI cards (Restaurants, Abonnements actifs, MRR, Commandes)
  + revenue line/area chart + plan donut, via TanStack Query. Loading skeletons, empty and error
  states — every admin data view in every phase gets all three; not repeated below.
- **Color semantics everywhere** (shared `StatusBadge` / `PlanBadge` in `src/components/admin/`):
  green = active, orange = trial, red = suspended/expired, blue = pro/enterprise.

**Verification:** owner/staff hitting `/admin` → redirected to `/dashboard`; admin hitting `/dashboard`
→ redirected to `/admin`; KPI numbers hand-match the seed data; charts bucket on Casa days.

---

## Phase 2 — Restaurants CRUD + permissions engine

### Permission resolution (single source of truth)

- `src/lib/features.ts`:
  - `PLAN_DEFAULTS: Record<Plan, Record<FeatureKey, boolean>>` — free: online_ordering +
    menu_editor + reservations; pro: + analytics, staff_management, floor_plan; enterprise: all
    (+ promotions when it exists).
  - `resolveFeatures(plan, overrides)` → merged `Record<FeatureKey, boolean>`; override rows win.
  - `isFeatureEnabled(ctx, key)` server helper for route guards.
  - Hard rule: **suspended/expired status beats everything** — `resolveFeatures` is irrelevant if
    status isn't active/trial (Phase 5 enforces).

### Admin API (all: `requireSuperAdmin()` → `createAdminClient()` → zod-validate → act → `logAdminAction`)

- `GET /api/admin/restaurants` — list with filters (`plan`, `status`, `city`, `q` on name/slug,
  `joined_after/before`), sort, pagination (`page/limit`, default 20). Returns per-row metrics the
  table needs: monthly revenue + order count (current Casa month, one grouped query — not N+1),
  owner `lastActiveAt` (max `auth.users.last_sign_in_at` of the tenant's profiles via
  `auth.admin.listUsers` or a small SQL view — decide at implementation, keep it one call).
- `POST /api/admin/restaurants` — onboarding: create restaurant row (+ default `subscriptions` row) +
  owner via `auth.admin.createUser({ email, password, email_confirm: true })` + `profiles` insert
  role=owner with `must_change_password = true`. **Rollback `deleteUser` on failure — exact same
  pattern as the existing staff POST route.** This replaces the original prompt's self-serve
  `POST /auth/register` (out of scope for the pilot; note it as a later phase if ever needed).
- `GET /api/admin/restaurants/[id]` — full detail: restaurant, subscription, resolved features
  (defaults + overrides, flagged which is which), 30-day revenue series, counts, recent audit entries.
- `PATCH /api/admin/restaurants/[id]` — edit profile fields, `plan` (writes both `restaurants.plan`
  and the `subscriptions` row), `status` (suspend/activate). Status and plan changes always audited
  with old→new in `metadata`.
- `DELETE /api/admin/restaurants/[id]` — **soft first**: set status `suspended` + audit. True delete
  only with explicit `?confirm=slug` matching, relying on the existing `on delete cascade` chain;
  UI requires typing the slug (destructive-action guard).
- `GET/PATCH /api/admin/restaurants/[id]/permissions` — resolved map / upsert one override
  (`onConflict: restaurant_id,feature_key`). Optional `reset` to delete an override back to plan default.
- `POST /api/admin/permissions/bulk` — `bulkPermissionsSchema`; one batched upsert of
  `restaurantIds × changes` rows; single audit entry with the full payload in `metadata`; returns
  per-restaurant result summary.

### Admin UI

- `src/app/admin/restaurants/page.tsx` — table (desktop) / card list (mobile): logo + name, city,
  `PlanBadge`, `StatusBadge`, monthly revenue, orders this month, last active. Filter bar + sortable
  columns + pagination. Row actions: Voir, Modifier, Suspendre, Supprimer (AlertDialog with slug-typing
  for delete).
- **Detail side panel** (`DetailSidePanel`, shadcn Sheet): metrics, subscription summary, inline
  permission toggles (Switch per feature, "par défaut du plan / remplacé" hint + reset), suspend/activate
  buttons, "Réinitialiser le mot de passe du propriétaire" (sets a temp password +
  `must_change_password = true` — reuses the existing flow; audited).
- `src/app/admin/permissions/page.tsx` — matrix view (restaurants × features) with **bulk mode**:
  checkbox-select restaurants → apply a permission set to all → confirm dialog showing the blast
  radius ("3 fonctionnalités sur 12 restaurants") → bulk endpoint. Optimistic updates with
  invalidation on settle; a failed bulk shows which restaurants failed.

**Verification:** filters/sort/pagination correct against seed; toggling a feature writes exactly one
override row and flips the resolved map; reset removes the row; bulk on 3 restaurants × 2 features
writes ≤6 rows + 1 audit entry; every mutation appears in `audit_logs`; created owner logs in, is
forced to change password, sees only their restaurant. **Re-run the tenant-isolation script** from
dashboard-Plan.md extended to `subscriptions`, `restaurant_features`, `audit_logs` (same rationale as
A6.3 — every new table is a new surface).

---

## Phase 3 — Subscriptions & billing (provider-agnostic — this replaces "Stripe integration")

**Reality check the original prompt missed:** Stripe cannot onboard Morocco-based merchants, and the
pilot bills in MAD. Building the Stripe webhook stack now is dead code. Instead:

- `src/lib/billing/` — `BillingProvider` interface (`createSubscription`, `changePlan`, `cancel`,
  `handleWebhook`) with a **`ManualBillingProvider`** as the only pilot implementation: plan/status
  changes are super-admin actions (Phase 2 PATCH), `notes` records the offline payment reference.
  A future `StripeBillingProvider` (or CMI/local PSP) slots in behind the same interface;
  `provider*` columns from Phase 0 are already there for it. Stub
  `POST /api/webhooks/billing` returning 501 with a comment pointing here — don't build webhook
  verification for a provider that can't exist yet.
- `GET /api/admin/subscriptions` — all subscriptions joined to restaurant name/plan/status, filterable.
- `src/app/admin/subscriptions/page.tsx` — table: restaurant, tier, status, cycle, `price_mad`,
  next renewal / trial end, notes. Inline "changer de plan / prolonger l'essai / marquer payé" actions
  (all through the Phase 2 PATCH + audit).
- **Trial/expiry sweep:** Supabase **pg_cron** job (in the migration or a `0004`) flipping
  `trial_ends_at < now()` trials → `restaurants.status = 'expired'`, `subscriptions.status =
  'past_due'`. No Node cron, no Redis queue. Admin Overview shows an "essais expirant sous 7 jours" strip.
- Owner-side visibility: small read-only "Abonnement" card in `/dashboard/settings` (plan, status,
  trial end) via the owner-select RLS policy from Phase 0 — owners see their plan, never billing internals.

**Verification:** set a seed trial's `trial_ends_at` to yesterday, run the cron function manually →
status flips and the restaurant is gated per Phase 5; plan change writes both tables + audit + is
visible in the owner's settings card.

---

## Phase 4 — Feature gating in the owner dashboard & public site

Wire the permissions the Super Admin sets into what tenants actually see. **Gate in three layers;
UI hiding alone is not enforcement:**

1. **API**: `requireFeature(key)` helper composed with the existing guards in `src/lib/dashboard.ts`
   (fetch overrides + plan once per request alongside `getSessionContext()`); applied to the matching
   `api/dashboard/*` route groups — menu routes ← `menu_editor`, staff ← `staff_management`,
   analytics ← `analytics`, tables ← `floor_plan`, reservation mutations ← `reservations`.
   Disabled → 403 `{ error: "Fonctionnalité non incluse dans votre offre" }`.
2. **Dashboard UI**: `getSessionContext()` grows a `features` map (one extra query, cached per
   request). `nav.tsx` hides disabled tabs; direct URL hits show an upgrade/lock panel
   (component `FeatureLocked`, "Fonctionnalité non activée — contactez Darna"), not a 404 — per the
   original prompt's "hide or lock".
3. **Public site `/[slug]`**: `online_ordering` off → menu stays browsable, cart/checkout hidden and
   order POST returns 403; `reservations` off → reservation form hidden + POST 403. The public menu
   is cached with `revalidateTag("menu")` — **permission toggles that affect the public site must
   trigger the same revalidation** (admin PATCH calls it — same gotcha class as settings routes in
   dashboard-Plan.md; check `node_modules/next/dist/docs/` for the Next 16 `revalidateTag` signature
   before coding, it differs from older majors).

**Verification:** toggle `menu_editor` off → owner nav loses Menu, direct `/dashboard/menu` shows the
lock panel, `curl PATCH api/dashboard/items/:id` → 403; toggle `online_ordering` off → public site
hides cart within a revalidation, order POST 403; staff nav unaffected except where their tabs are gated.

---

## Phase 5 — Suspension/expiry enforcement + audit log UI + hardening

- **Suspension gate** (status `suspended`/`expired`):
  - Owner/staff: dashboard layout + `requireSession()`/`requireOwner()` return a "Compte suspendu —
    contactez Darna" page / 403 JSON. Server-side in the guards (the `must_change_password` lesson:
    layouts and middleware redirect, guards enforce).
  - Public `/[slug]`: suspended → friendly "restaurant momentanément indisponible" page (not a 404,
    not a crash); expired-trial → menu visible, ordering + reservations off.
  - Login stays possible (they need to see the suspended notice), all mutations blocked.
- `src/app/admin/audit/page.tsx` + `GET /api/admin/audit` — filter by restaurant/action/date,
  paginated, newest first; `metadata` in an expandable row.
- **Rate limiting**: Supabase Auth already rate-limits `/auth` endpoints (configure in the dashboard;
  document the 10-attempts guidance in README). Do **not** build a Redis/in-memory limiter — in-memory
  doesn't survive serverless instances and Redis isn't in this stack. If admin-route limiting is ever
  needed, a small Postgres-based counter is the pattern; leave a TODO, don't build it.
- **Consistent error shape**: sweep `api/admin/*` (and touched dashboard routes) to
  `{ error: { code, message } }` per the original prompt — one `apiError(code, message, status)`
  helper in `src/lib/api.ts`. Don't retrofit every legacy route in this plan; new/touched only.
- `.env.example`: confirm it lists `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`; add any new vars this plan introduces (none expected — billing is manual).

**Verification (end-to-end, the plan's exit criteria):**
- `npx tsc --noEmit` + `npm run lint` at every phase boundary (dev server is on :4000).
- Full tenant-isolation script one final time across **all** tables.
- Suspend restaurant A: owner sees suspended page, staff API calls 403, public site shows the
  unavailable page, restaurant B unaffected.
- Every admin mutation performed during testing has a matching `audit_logs` row — count them.
- Admin session cannot read the dashboard as a tenant and vice-versa (layout + guard both).

---

## Build order

1. Phase 0 — migration + types + `requireSuperAdmin()` + audit helper + seed
2. Phase 1 — admin shell + login routing + Overview
3. Phase 2 — restaurants CRUD + permission engine + bulk UI
4. Phase 3 — subscriptions page + manual billing + pg_cron expiry
5. Phase 4 — feature gating (API → dashboard → public site)
6. Phase 5 — suspension enforcement + audit UI + hardening + E2E verification

Confirm each phase's verification before moving on.

## Risks / gotchas

- **Every `api/admin/*` route uses the service role — `requireSuperAdmin()` is the only boundary.**
  One forgotten guard is a full cross-tenant read. Grep-check before Phase 5 sign-off:
  every file under `api/admin` calls it first.
- **This is Next 16** — verify `revalidateTag`, route-handler, and caching semantics in
  `node_modules/next/dist/docs/` before coding; do not trust training-data Next.js.
- **Feature gating must be API-first.** Hidden nav with an open endpoint is not a disabled feature.
- **Suspension beats permissions** — resolve status before features everywhere, or a suspended Pro
  restaurant keeps ordering enabled.
- **Audit writes are part of the mutation**, not fire-and-forget.
- **Timezone**: all "this month / today" metrics in admin views use `src/lib/time.ts` Casa helpers —
  the same ESLint `no-restricted-imports` rule from dashboard-Plan.md A9 covers new code too.
- **Supabase `.limit(1000)` default** on every aggregate query — always set limits explicitly.
- **Don't build Stripe now.** The interface seam (Phase 3) is the deliverable; webhooks for an
  unavailable provider are dead code and a fake sense of billing safety.
