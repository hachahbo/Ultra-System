# Darna — Phase 7: Performance & Web Vitals

> **Status: substantially complete.** This file was a generic pre-written spec.
> Cross-checked against the live codebase on 2026-07-20: **~90% of the tasks
> below were already implemented** (in most cases with better technical
> choices than this doc originally assumed — see "Corrected from original
> plan" notes throughout). What's left is scoped down to the real remaining
> gaps. See `PROJECT-STATE.md` §"Performance & Web Vitals" and
> `ROADMAP-PHASE7.md` for the authoritative running record.

**Goal:** Public menu LCP <2s on mobile, Lighthouse Performance 90+, all Core Web Vitals green
**Original estimated effort:** 4–5 days — **actual remaining effort: ~half a day** (baseline capture + one a11y test)
**Run after:** Phase 5 of the 9/10 roadmap — **done**
**Run before:** Phase 6 (Restaurant-OS depth) — **Phase 6.1–6.3 already shipped in parallel/after**

---

## Corrected assumptions (read before executing anything below)

The original plan was written without seeing this repo. Three of its
assumptions don't hold here — following them literally would waste time or
regress deliberate decisions already made:

1. **No `@next/bundle-analyzer`.** This project builds with **Turbopack**
   (`next dev`/`next build`, no `--webpack` flag anywhere) — the
   webpack-only `@next/bundle-analyzer` plugin is a silent no-op under
   Turbopack. Use the built-in `npx next experimental-analyze` instead
   (Next 16.1+; this project is on 16.2.10). Already noted as a comment in
   `next.config.ts`.
2. **No server-side Sharp upload pipeline.** `src/lib/image-pipeline.ts`
   (server-side Sharp, as the plan specifies) doesn't exist **by design**:
   the two upload paths in this app are either browser-direct-to-Supabase-
   Storage (Sharp can't run in a browser) or already require pre-compressed
   WebP input server-side. Instead, `src/lib/image.ts` has `compressImage()`
   — a client-side `canvas.toBlob` iterative-quality-reduction compressor
   (mirrors the plan's quality-reduction loop, MAX_BYTES 500KB, same as the
   spec) that runs before upload. This is the correct architecture for this
   app's upload paths; do not add a redundant server-side Sharp step.
3. **Admin `/permissions` and `/subscriptions` are deliberately NOT
   paginated.** The original Task 7.3.2 asks to paginate them. The team
   already evaluated this and rejected it in code comments: both views have
   a bulk "select all restaurants" flow that needs the full un-paginated set
   in memory — paginating would either silently limit bulk actions to the
   visible page or require a cross-page-selection redesign neither view has.
   Documented as an accepted tradeoff, revisit only past ~200 tenants. **Do
   not implement Task 7.3.2 as originally written.**

---

## What's already done (verified against the live tree, not just docs)

| Task | Plan said | Reality |
|---|---|---|
| 7.1.1 Bundle analyzer | Install `@next/bundle-analyzer` | N/A under Turbopack — use `next experimental-analyze` (see above) |
| 7.1.2 Lighthouse baseline | Run manually, record scores | **Not yet captured** — see "Remaining work" below (was blocked on no system Chrome; that's no longer true, see below) |
| 7.1.3 Performance budget doc | Create `perf-baseline/budget.md` | **Not created yet** — folder doesn't exist. Real remaining task. |
| 7.2.1 `next/image` remotePatterns | Hardcode one Supabase project ref | Done, better: wildcard `*.supabase.co` + `images.unsplash.com`, AVIF/WebP formats, tuned `deviceSizes`/`imageSizes`, 30-day cache TTL — all live in `next.config.ts` |
| 7.2.2 Replace all `<img>` | Manual audit + replace | **Done** — zero `<img>` tags remain in `src/` (verified via grep); PROJECT-STATE logs 19 converted to `next/image`, hero has `priority` |
| 7.2.3 Server Sharp pipeline | Create `image-pipeline.ts` | **Correctly not built this way** — see Corrected Assumptions #2. Client-side equivalent exists and is wired into theme/logo uploads (capped 1MB WebP, iterative quality reduction) |
| 7.2.4 Move HTML mockups out of `src/` | `mv` to `design-mockups/` | **Done** — zero `.html` files in `src/`; 8 mockup files live in `design-mockups/` at repo root |
| 7.3.1 Dynamic imports for heavy components | Recharts, dialogs, below-fold | **Done** — `next/dynamic` used in `[slug]/page.tsx` (ValuesSection/TestimonialsSection), `admin/page.tsx`, `dashboard/analytics/page.tsx` (Recharts charts) |
| 7.3.2 Paginate admin permissions/subscriptions | Add `?page&limit` | **Deliberately not done** — see Corrected Assumptions #3 |
| 7.3.3 Server-side analytics aggregate | New RPC `get_revenue_by_day` etc. in `0016_analytics_rollup.sql` | **Done, different name/shape**: `get_order_aggregates(days_back)` in `supabase/migrations/0016_analytics_orders_rollup.sql` — replaced the raw up-to-20k-row `orders` fetch. Same goal, already shipped. |
| 7.3.4 Below-fold deferral on public menu | Split into above/below-fold dynamic imports | **Done in spirit** — hero + specials are SSR (LCP-critical), `ValuesSection`/`TestimonialsSection` dynamically imported below the fold |
| 7.4.1 `lighthouserc.js` | Create with 4 URLs, desktop preset | **Done** — exists at repo root, targets `/orendezvous` (the real seeded slug, not the plan's placeholder `/o-rendezvous`), desktop preset, same assertion thresholds |
| 7.4.2 Lighthouse in CI | New GH Actions job | **Done** — `.github/workflows/ci.yml` has a `lighthouse` job, gated on `LHCI_GITHUB_APP_TOKEN` being configured so it doesn't permanently red a fork; noted limitation: `/dashboard`/`/admin` runs currently measure the unauthenticated login redirect, not the real page (no login step wired yet) |
| 7.4.3 RUM (web-vitals + `/api/vitals` + admin panel) | New migration, route, component, admin chart | **Done, fully** — `0017_web_vitals.sql` (table + `get_web_vitals_p75` RPC), `src/app/api/vitals/route.ts`, `src/components/web-vitals-reporter.tsx` mounted in root layout, P75-by-surface panel live in `overview-view.tsx` |
| 7.4.4 Accessibility (axe) | `axe-cli` one-off + fix violations | **Partially done** — `@axe-core/playwright` is installed as a devDependency but **not actually wired into any test**. Real remaining gap, see below. |

---

## Remaining work (the only things left to actually execute)

### 1. Capture a real Lighthouse baseline — still genuinely blocked here, but for a narrower reason than documented

`PROJECT-STATE.md` says "blocked on a runner with system Chrome." Verified
more precisely in this session: Playwright's bundled Chromium binary **is**
present (`~/.cache/ms-playwright/chromium-1228/`), but it fails to launch —
`error while loading shared libraries: libnspr4.so: cannot open shared
object file` — because this sandbox is missing base runtime libraries
(`libnspr4`, likely `libnss3` and friends) that a normal Ubuntu/Debian
Playwright install brings in via `npx playwright install-deps`. This
sandbox has **no `apt-get`/package manager on PATH**, so those can't be
installed here. Confirmed the same failure blocks **both** `lighthouse` and
plain `playwright.chromium.launch()` — this is an environment gap, not a
project one.

**Unblocks itself automatically** the first time this runs on a normal dev
machine or GitHub's `ubuntu-latest` CI runner (which ships Chrome
pre-installed — exactly why the `lighthouse` job in `ci.yml` already works
there and only needs `LHCI_GITHUB_APP_TOKEN` configured). Nothing to fix in
the codebase; re-run this task from a machine with a working browser:

```bash
npx lighthouse http://localhost:4000/orendezvous \
  --output=json --output=html --output-path=perf-baseline/menu \
  --preset=perf --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=simulate
```

Then fill in `perf-baseline/budget.md` with the real numbers.

### 2. Wire `@axe-core/playwright` into an actual test — **done this session**

It was installed but unused. Added `e2e/accessibility.spec.ts`: scans the
five unauthenticated public storefront pages (home, menu, about, contact,
reservation) with `AxeBuilder` under `wcag2a`/`wcag2aa`/`wcag21aa` tags,
failing on any `serious`/`critical` violation. Follows the same
"runs against a real server, gated on `BASE_URL`" convention as
`e2e/rbac.spec.ts`, so it activates in the existing `e2e` CI job with zero
extra secrets (no login required, unlike the RBAC suite). **Not executable
in this sandbox** (see #1 — same missing-library blocker), but `tsc
--noEmit` passes clean; it'll run for real the next time `npx playwright
test` runs somewhere with a working Chromium.

---

*Part of the Darna master roadmap. Corrected and reconciled against the live
codebase 2026-07-20 — see `PROJECT-STATE.md` for the architectural source of
truth going forward; this file should not be treated as a template for
future phases without the same reconciliation pass.*
