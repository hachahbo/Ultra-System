# Darna — Roadmap to 9/10 (project-matched)

> Adapted from the generic "Roadmap to 9/10" against the **actual** repo state
> (migrations `0001`–`0009`, `main` working tree, verified 2026-07-19).
> Every task below has been checked to reference files/routes/functions that
> really exist. **Divergences from the generic plan are called out inline as
> `⚠ CORRECTION`.**
>
> Conventions this repo actually uses:
> - **Package manager: npm** (`package-lock.json`, no `packageManager` field). The generic plan's `pnpm …` commands are wrong here — use `npm run` / `npx`.
> - **No `typecheck`/`test` npm scripts exist** — only `dev/build/start/lint`. Phase 3 adds them.
> - **Migrations applied via direct `pg` pooler** (no local Supabase stack, no `supabase/config.toml`). Next migration number is **`0010`**.
> - **No Edge runtime / `middleware.ts`** — auth gating is `src/proxy.ts` (Next 16 proxy, nodejs). Don't introduce edge functions.
> - Reference doc is **`PROJECT-STATE.md`** (not `state-of-project.md`).

---

## 🔴 Phase 0 — Security (Day 1)

**The one genuinely urgent item.** Confirmed: `spread_tables.mjs`, `check-db.js`, `test-profile.js`, **and `check_tables.mjs`** are git-tracked, and `spread_tables.mjs` embeds a live `service_role` JWT. `.env` itself is **not** tracked (only `.env.example`) — good.

### Task 0.1 — Rotate the key (do this first, everything else is secondary)
1. Supabase Dashboard → Settings → API → **Reset `service_role` key**.
2. Update the new key in `.env` and every deploy env (Vercel/host).
3. **Once rotated, the key in git history is inert** — so history rewriting is *hygiene*, not emergency. ⚠ **CORRECTION:** the generic plan's `git filter-repo --invert-paths` + force-push is **not installed** (`git-filter-repo` absent) and force-pushing rewritten history is destructive on any shared branch. Do it only if this repo is solo/unpushed, and confirm first. Otherwise: rotate, delete files from HEAD, move on.

### Task 0.2 — Remove & neutralize the offending files
1. `git rm spread_tables.mjs check-db.js test-profile.js check_tables.mjs` ⚠ **CORRECTION:** the generic plan lists 3 files and misses **`check_tables.mjs`** — all four are tracked.
2. If any logic is still needed, rewrite to read `process.env.SUPABASE_SERVICE_ROLE_KEY` (mirror the pattern in `scripts/seed-orendezvous-team.mjs`, which already does this correctly).
3. Add to `.gitignore`: `spread_tables.*`, `check-db.*`, `test-profile.*`, `check_tables.*`, `*.tmp.mjs`. (`.env*` is already ignored — no change needed there.)

### Task 0.3 — Prevent recurrence
1. **CI secret scan (reliable path):** add the official **`gitleaks/gitleaks-action`** to a GitHub Action on every PR. ⚠ **CORRECTION:** the generic plan's local hook `npx gitleaks protect` **won't run** — `gitleaks` is a Go binary, not an npm package; `npx gitleaks` resolves nothing. For a *local* pre-commit guard use husky + a simple staged-diff grep for `eyJ[A-Za-z0-9_-]{20,}` (JWT shape), or document installing the gitleaks binary separately.
2. `npm i -D husky lint-staged` → `npx husky init` → pre-commit runs the JWT-shape grep over staged files.

**DoD:** new key in prod, old key revoked, four files gone from HEAD, CI blocks JWTs on PRs.

---

## 🟠 Phase 1 — Correctness & Rate Limits (Days 2–3)

### Task 1.1 — Rate-limit public writes
- Targets: `src/app/api/orders/route.ts` and `src/app/api/reservations/route.ts` (both public, service-role, slug-scoped, Zod-validated — confirmed, and currently **unthrottled**).
- ⚠ **CORRECTION / recommendation:** default to a **Postgres token-bucket**, not Upstash. This project runs on a single Supabase project with no Redis; adding Upstash means a new account + new env var + a network hop on the hot order path. A `rate_limits(key, window_start, count)` table hit with the existing `createAdminClient()` keeps the "one datastore" simplicity. (Upstash stays a valid choice only if you already plan to add Redis for other reasons.)
- New `src/lib/rate-limit.ts`: per-IP (10/min orders, 5/min reservations) + per-slug soft cap (100 orders/hr → 429 + log). Return `429` with `Retry-After`.
- Log hits to `audit_logs` with `action: 'rate_limit_hit'` (the table's `action` column is free-text — no schema change; but `admin_id` is `NOT NULL references auth.users`, so for anonymous public hits either make `admin_id` nullable in a migration or log to a separate `metadata`-only sink — **decide this explicitly**, it's a real FK constraint the generic plan glosses over).

### Task 1.2 — Migration `0010_churn_and_integrity.sql`
⚠ **CORRECTION — the generic plan's SQL will fail as written:** it does `create trigger orders_touch_updated_at … execute function set_updated_at()`, but **`set_updated_at()` does not exist** in this DB. Create the function first:
```sql
-- helper the generic plan assumed existed
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- churn tracking
alter table public.subscriptions add column canceled_at timestamptz;
update public.subscriptions set canceled_at = updated_at where status = 'canceled';

-- franchise integrity (0009 added parent_restaurant_id with no guards)
alter table public.restaurants add constraint no_self_parent
  check (parent_restaurant_id is null or parent_restaurant_id <> id);

create or replace function public.reject_franchise_grandchildren()
returns trigger language plpgsql as $$
begin
  if new.parent_restaurant_id is not null
     and exists (select 1 from public.restaurants
                 where id = new.parent_restaurant_id
                 and parent_restaurant_id is not null) then
    raise exception 'Franchise tree limited to one level';
  end if;
  return new;
end $$;
create trigger enforce_franchise_depth
  before insert or update on public.restaurants
  for each row execute function public.reject_franchise_grandchildren();

-- make orders.updated_at trustworthy (column exists since 0002, no trigger yet)
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
```

### Task 1.3 — Switch churn math to `canceled_at`
- File: `src/app/api/admin/analytics/route.ts`. Replace the two `updated_at` reads in the churn/acquisition logic (`canceledThisPeriod` filter and the 8-week `acqMap` "lost" bucketing) with `canceled_at`. Keep the monthly-normalization reducer untouched.

### Task 1.4 — Audit-log owner-side team mutations
⚠ **CORRECTION on scope — two claims in the generic plan are off:**
- **Wrong path:** it targets `/api/dashboard/team/*`. The routes are **`/api/dashboard/staff/route.ts`** (GET/POST) and **`/api/dashboard/staff/[id]/route.ts`** (PATCH/DELETE).
- **"Last active owner" guard is largely already done:** invites are restricted to `manager/serveur/cuisine` (never owner), and `staff/[id]` already rejects any target where `target.role === 'owner'` and blocks self-deactivation. There is exactly one owner and the API refuses to touch any owner — so the real gap is **only the audit trail**, not the guard.
- **Reuse, don't rebuild:** `logAdminAction(adminId, action, targetRestaurantId, metadata)` already exists and `audit_logs.admin_id references auth.users` — an owner **is** an auth user, so it satisfies the FK directly. Just call it from the staff invite/patch/delete handlers with the owner's `ctx.profile.id`. The generic plan's "generalize to `logAction(actorType, …)`" is optional polish, not required to ship this.

**DoD:** rate limits live, `canceled_at` populated + used, franchise tree can't cycle/nest, staff mutations audited.

---

## 🟡 Phase 2 — Scale Prep (Days 4–6)

### Task 2.1 — Migration `0011_indexes.sql`
Confirmed missing today (checked `pg_indexes` against the migrations):
```sql
create index profiles_restaurant_idx on public.profiles (restaurant_id);
create index orders_created_idx on public.orders (created_at desc);
create index orders_open_idx on public.orders (restaurant_id) where status <> 'done';
create index subscriptions_status_updated_idx on public.subscriptions (status, canceled_at desc);
create index reservations_pending_idx on public.reservations (restaurant_id) where status = 'new';
```
`EXPLAIN ANALYZE` the 5 hot queries before/after; paste numbers in the PR. (`orders (restaurant_id, created_at desc)`, `items`, `customers`, inventory, and `audit_logs` indexes already exist — don't re-add.)

### Task 2.2 — Kill the Auth-API N+1
Real hotspots confirmed: `/api/admin/restaurants` calls `auth.admin.getUserById()` **per row**; `/api/admin/analytics` pages **all** auth users via `listUsers` on **every** request.
- **Ship Option B first (today):** wrap the `listUsers` pagination + the per-row `getUserById` map in `unstable_cache(fn, ['auth-last-signin'], { revalidate: 60 })`.
- **Then Option A (proper):** add `profiles.last_sign_in_at`, backfill from `auth.users`, keep fresh via a trigger on `auth.users`. ⚠ **CORRECTION:** the generic plan suggests "a Supabase Auth Hook that calls an **edge function**" — this project has **no edge functions and shouldn't add one** (see conventions). A migration-created trigger on `auth.users`, or the Supabase `after-sign-in` Auth Hook pointing at a Postgres function (not an edge fn), fits the existing model.

### Task 2.3 — Cache admin analytics
- Wrap the payload assembly in `unstable_cache(fn, ['admin-analytics'], { revalidate: 60, tags: ['admin-analytics'] })`.
- Invalidate on subscription/restaurant mutations with `revalidateTag('admin-analytics', 'max')` — ⚠ **match the repo's existing two-arg `revalidateTag(tag, profile)` convention** (see `permissions/bulk/route.ts` calling `revalidateTag("menu", "max")`).
- Optional: split KPIs+health from the heavy tables into a lazy second fetch.

### Task 2.4 — Parallelize `getSessionContext`
`src/lib/dashboard.ts` currently runs profile → restaurant → features sequentially. Quick win: `Promise.all` the restaurant + features reads after the profile resolves (profile is needed for `restaurant_id`, so it's 1 + parallel-2, not fully parallel). Proper: a `get_session_context(uid)` RPC returning JSON.

### Task 2.5 — Paginate admin "fetch-all" endpoints
`/api/admin/permissions` and `/api/admin/subscriptions` read every row. Add cursor pagination + server search, mirroring the existing pattern in `/api/admin/restaurants/route.ts`. (Fine to defer past ~200 tenants.)

**DoD:** indexes live w/ EXPLAIN evidence, admin analytics cached <500ms, no Auth-API loops in hot paths.

---

## 🟢 Phase 3 — Testing Foundation (Days 7–9)

### Task 3.1 — Vitest + unit tests
- `npm i -D vitest` (⚠ **npm, not pnpm**); add `vitest.config.ts` and `"typecheck": "tsc --noEmit"`, `"test": "vitest"` to `package.json` scripts (they don't exist yet).
- **Extract-then-test the MRR math:** the churn/ARPU/growth logic is inline in `analytics/route.ts`. Pull it into a pure `src/lib/analytics-math.ts` first, then test — a route file can't be unit-tested cleanly.
- Cover `src/lib/permissions.ts` (every `(role, route)` for `canAccessRoute`/`canWrite`/`defaultRouteFor`) and `src/lib/features.ts` (`resolveFeatures`). ~40 tests, 100% on these three files.

### Task 3.2 — Playwright RBAC smoke
- `npm i -D @playwright/test` + `npx playwright install --with-deps chromium`.
- One test per role (seed creds already exist: `manager@/serveur@/cuisine@orendezvous.ma`, `must_change_password: true` — the test must handle the forced password-change redirect on first login). Assert per-route 200-render vs `defaultRouteFor(role)` redirect; attempt a write on a read-only route → 403.

### Task 3.3 — CI
⚠ **CORRECTION — the generic plan's "Playwright against a seeded local Supabase" doesn't match this project:** there's **no local Supabase stack** (no `config.toml`; migrations go through the hosted pooler). Options, pick one and document it: (a) point E2E at a **dedicated hosted test project / Supabase branch**, (b) gate E2E to run manually/nightly against staging rather than per-PR, or (c) stand up `supabase start` in CI only if you first add local config. **Unit tests + typecheck + lint run in CI unconditionally**; E2E gets the caveat above.
- `.github/workflows/ci.yml`: `npm run typecheck`, `npm run lint`, `npm test`, then E2E per the chosen option.

**DoD:** green CI, RBAC matrix + MRR math regression-covered.

---

## 🔵 Phase 4 — Code Quality Pass (Days 10–11)

Accurate as written — these duplications are real (verified across `overview-view`, `subscriptions-view`, `restaurants-view`, `permissions-view`, `staff-management`):
- **`src/lib/avatar.ts`** for the 5× copy-pasted `initialsOf()` (note the two live semantics: email-based in `staff-management`, name-based elsewhere — pick per call site).
- **`src/components/admin/primitives.tsx`**: `KpiCard`, `AvatarChip`, `StatusDot`, `FilterChips`, `DataTableShell` (skeleton+Empty+rows). ~400–600 LOC deletable.
- **Unify palettes** into `src/components/admin/badges.tsx`; resolve the real **pro = blue (badges.tsx) vs pro = orange (mockup-derived views)** inconsistency and document the choice.
- **`formatPrice(amount, { hideZeroCents })`** to kill the `.replace(".00","")` calls.
- **`pos-view.tsx`** still renders hardcoded Tacos-era mock data — wire to `/api/dashboard/menu` or delete (recommend delete until POS is real).
- **Move the 8 `* - Standalone.html` mockups + `src/components/site/Dashboard.html`** to `/design-mockups/` (some are 400KB+ and sit inside `src/components/**`, confusing tooling). Add to `.gitignore` if untracked history is fine.

**DoD:** no duplicated color/avatar logic, dead code gone, net LOC decrease.

---

## 🟣 Phase 5 — Payload & Public Perf (Day 12)

### Task 5.1 — Chart payload slim
- `/api/admin/analytics` returns bucketed series only; round to day granularity server-side; drop `statusCounts`/`planCounts` (superseded by `planDistribution` — confirm no remaining consumer in `overview-view.tsx` before deleting).

### Task 5.2 — Public storefront ISR
- `generateStaticParams` for `/[slug]` returning active restaurants; `export const revalidate = 60`.
- `next/image` `remotePatterns` for the Supabase Storage host (dish photos + `menu-images` bucket).
- Public reads are already `unstable_cache(60, tag "menu")` (see `src/lib/menu.ts`) — layer ISR on top, don't replace.

**DoD:** analytics payload <100KB, storefronts serve from CDN on repeat visits.

---

## Corrected PR / branch structure

| PR | Branch | Contains | Notes vs generic plan |
|---|---|---|---|
| #1 | `security/rotate-and-scan` | Phase 0 | +`check_tables.mjs`; history-purge optional |
| #2 | `feat/rate-limit-and-integrity` | Phase 1 + **`0010`** | `set_updated_at()` created; Postgres bucket; staff (not team) routes |
| #3 | `perf/indexes-and-cache` | Phase 2 + **`0011`** | trigger not edge fn; two-arg `revalidateTag` |
| #4 | `test/vitest-and-playwright` | Phase 3 + CI | npm scripts added; E2E not "local Supabase" |
| #5 | `refactor/primitives-and-palettes` | Phase 4 | as written — accurate |
| #6 | `perf/payload-and-isr` | Phase 5 | as written — accurate |

## What the generic plan got materially wrong (summary)
1. **`set_updated_at()` doesn't exist** — its `0010` trigger would error. (Phase 1.2)
2. **Team routes are `/api/dashboard/staff*`, not `/api/dashboard/team/*`.** (Phase 1.4)
3. **Missed `check_tables.mjs`** among the tracked secret-adjacent files. (Phase 0)
4. **`pnpm` everywhere** — this repo is **npm**, and has no `typecheck`/`test` scripts yet. (Phases 3, CI)
5. **"Local Supabase" for E2E** — none exists; migrations run via hosted pooler. (Phase 3.3)
6. **`npx gitleaks` local hook won't run** — gitleaks isn't an npm package. (Phase 0.2)
7. **Edge-function auth hook** — this project deliberately has no edge runtime; use a Postgres trigger. (Phase 2.2)
8. **"Last-owner" guard already exists** de facto — the real gap is only audit logging. (Phase 1.4)
9. **`audit_logs.admin_id` is `NOT NULL → auth.users`** — logging anonymous `rate_limit_hit` needs a nullable column or a separate sink; the plan assumes free logging. (Phase 1.1)
10. History purge tooling (`git-filter-repo`) **isn't installed**, and force-push is unsafe on shared history. (Phase 0.1)

*Everything else in the generic roadmap (phasing, risk×impact order, indexes, caching, primitives extraction, ISR) is accurate for this repo and preserved.*
