# Darna — Phase 7: Performance & Web Vitals (project-matched)

> Adapted from the generic "Phase 7" against the **actual** repo state
> (verified 2026-07-19, migrations through `0014_kds.sql`, Phase 6.1 landed).
> Strategy and sub-phase structure are kept — they're sound. Several tasks
> assume things that don't exist in this codebase (a `next.config.js` to
> create, an unoptimized upload pipeline, a "MenuSections" component, an
> `.github/workflows/ci.yml` to create from scratch) and one task would
> **actively break an existing, deliberate architectural decision**
> (unpaginated admin routes). Corrections are marked `⚠ FIX`. One net-new,
> high-value finding the generic plan completely missed is marked `🔥`.

---

## What's already done (don't rebuild)

| Plan assumes needed | Actual status |
|---|---|
| `next.config.js` to create | ✅ **`next.config.ts` already exists** (TypeScript config) with `images.remotePatterns` (wildcard `*.supabase.co`, broader than the plan's exact-hostname pattern) and `experimental.optimizePackageImports` already covering `lucide-react`, `recharts`, `framer-motion`, `date-fns`, `radix-ui`. |
| 8 HTML mockups inside `src/components/` | ✅ **Already moved** to `design-mockups/` at repo root (Task 7.2.4 is done — confirmed via `git status`, staged as renames). |
| `.github/workflows/ci.yml` to create | ✅ **Already exists** — `typecheck`/`lint`/`test` job plus a conditional `e2e` job (Playwright, gated on a `BASE_URL` secret). Task 7.4.2 needs to **add** a `lighthouse` job, not create the file. |
| `npm run typecheck` / `lint` / `test` scripts | ✅ All exist and match what the plan's PR checklist and CI additions expect. |
| Client-side image compression before upload | ✅ **Already exists** — `src/lib/image.ts: compressImage()` (canvas-based, resizes to max 1280px, WebP output, quality 0.82), already wired into every owner-facing upload (dish photos, logo). |

---

## 🔥 The generic plan's biggest miss: unoptimized static hero fallbacks

Nobody asked "how big are the actual files," so the generic plan never found
this. Checked directly:

```
public/images/Gemini_Generated_Image_igfco9igfco9igfc.png   6.8M
public/images/Gemini_Generated_Image_hs7cwmhs7cwmhs7c.png   6.8M
public/images/Gemini_Generated_Image_eepocveepocveepo.png   6.7M
public/images/Gemini_Generated_Image_izo3jjizo3jjizo3.png   6.6M   ← default "pop" fallback
public/images/orendezvous.tanger_..._73557593345.jpg        1.6M   ← default hero fallback
```

`src/components/site/hero-images.tsx` — a **client component rendered above
the fold on every `[slug]` homepage** — falls back to these when a
restaurant hasn't set a custom hero/pop image:

```tsx
const main = images?.[0] ?? "/images/orendezvous.tanger_..._73557593345.jpg"; // 1.6MB
const pop  = images?.[1] ?? "/images/Gemini_Generated_Image_izo3jjizo3jjizo3.png"; // 6.6MB
...
<img src={main} alt="Restaurant interior" className="h-full w-full object-cover" />
...
<img src={pop} alt="Delicious food plate" className="h-full w-full scale-[1.25] object-cover object-center" />
```

`main` **is the LCP element** on any restaurant that hasn't uploaded a
custom hero image — i.e. every trial/new signup, which is exactly the
first-impression page that matters most. A 1.6MB JPEG (plus a 6.6MB PNG
loaded right after, same viewport on desktop) served with zero
optimization plausibly explains most of the LCP problem on its own, before
touching anything else in this plan. Fixing this (Task 7.2.2, corrected
below) is the single highest-value item in the whole phase.

---

## 🔴 Phase 7.1 — Baseline & Budget — mostly unchanged

Tasks 7.1.2 (Lighthouse baseline) and the `perf-baseline/budget.md` table
are accurate as written — do them as-is.

**⚠ FIX (7.1.1) — bigger than a filename swap.** `@next/bundle-analyzer`
is **webpack-only** — it hooks `config.plugins.push(...)`, which does
nothing under Turbopack. This project's `dev`/`build` scripts run Turbopack
by default (no `--webpack` flag anywhere), so wrapping `next.config.ts`
with `@next/bundle-analyzer` as the generic plan instructs would silently
produce **zero output**, not a broken build — the kind of failure that's
easy to miss. Confirmed by actually installing it, wrapping the config, and
running `ANALYZE=true npm run build`: no treemap, no error, nothing.

Next 16.1+ (this project: 16.2.10) ships its own **Turbopack-native**
bundle analyzer — no package to install:

```bash
npx next experimental-analyze            # interactive, opens in-browser
npx next experimental-analyze --output   # writes to .next/diagnostics/analyze
```

Verified this actually works in this project — real per-route module data,
filterable by client/server. Just edit `next.config.ts` (TS, not
`next.config.js`) for the `webVitalsAttribution` addition; skip the
analyzer wrapper entirely:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { /* existing remotePatterns — see 7.2.1 for additions */ },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion", "date-fns", "radix-ui"],
    webVitalsAttribution: ["CLS", "LCP", "INP"],
  },
};

export default nextConfig;
```

**⚠ FIX (7.1.3):** Drop `bundlePagesRouterDependencies` — this project is
100% App Router (no `pages/` directory exists), that flag is a no-op here
and was carried over from a generic template. Skip it; there's no
equivalent budget-enforcement flag needed beyond the CI Lighthouse
assertions added in 7.4.

**Deliverable checklist unchanged** — bundle treemap screenshot, baseline
Lighthouse JSON in `perf-baseline/`, `budget.md` filled in.

---

## 🔴 Phase 7.2 — Image Pipeline — significantly corrected

### Task 7.2.1 — `next/image` config

Additive, not a full rewrite — the `remotePatterns` entry already exists.
Just add the tuning block:

```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "*.supabase.co" },
    { protocol: "https", hostname: "images.unsplash.com" },
  ],
  formats: ["image/avif", "image/webp"],
  deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
  imageSizes: [64, 96, 128, 256, 384],
  minimumCacheTTL: 60 * 60 * 24 * 30,
},
```

No hostname placeholder to fill in — the wildcard pattern already covers
every Supabase project's storage domain.

### Task 7.2.2 — Replace `<img>` tags — corrected inventory

**⚠ Correction to this file's own first pass:** the initial grep used
`"<img "` (trailing space), which misses every tag that wraps onto its own
line (`<img\n  src=...`) — a very common pattern in this codebase. Redone
with `"<img\b"`: the real count is **19 tags**, not 9 — including four more
real photos (`about/page.tsx`'s 4-image grid, `welcome-section.tsx`'s
near-identical 4-image grid, `specials-section.tsx`'s featured-dish
collage) that the first pass missed entirely. Full list:

| File | Tag(s) | What it is | Action |
|---|---|---|---|
| `hero-images.tsx` (`main`) | 1 | **The LCP element** — dynamic (theme) or 1.6MB static fallback | `next/image`, **`priority`**, `sizes="(min-width: 1024px) 45vw, 90vw"` |
| `hero-images.tsx` (`pop`) | 1 | Secondary hero, desktop-only, dynamic or 6.6MB static fallback | `next/image`, no `priority`, `sizes="35vw"` |
| `hero-images.tsx` decorative | 3 | `Group (n).svg` botanicals | `next/image`, explicit `width`/`height` from each SVG's real viewBox |
| `specials-section.tsx` decorative | 3 | Same pattern | Same |
| `specials-section.tsx` collage | 1 | Featured-dish photo, ~600KB | `next/image`, `fill` |
| `about/page.tsx` image grid | 4 | Ambiance photos, 284KB–1.6MB | `next/image`, `fill` |
| `about/page.tsx` bento cards | 2 | Table/interior photos | `next/image`, `fill` |
| `welcome-section.tsx` image grid | 4 | **Near-duplicate of `about/page.tsx`'s grid** — same 4 filenames, same layout, already had a dead unused `import Image from "next/image"` sitting at the top (half-finished prior migration) | `next/image`, `fill` |

**🔥 A second, related discovery from fixing this:** one of the five
oversized files targeted for replacement
(`orendezvous.tanger_..._3882496730852669917_....jpg`) was referenced by
**three separate components** (`hero-images.tsx`'s `main` fallback,
`about/page.tsx`'s grid, `welcome-section.tsx`'s grid) — deleting the
source file after compressing it would have 404'd two components that
weren't even being edited in this pass. Repointed both to the new
`hero-default.webp`.

**⚠ FIX — decorative SVGs are not the same problem as photos.** The
generic plan's blanket "replace every `<img>` with `<Image>`" doesn't buy
compression here — these are hand-drawn vector shapes already at minimal
byte size, not the LCP element, and mostly `opacity-60` decoration behind
the real content. Converting them is still worth doing for **CLS
prevention** (forces explicit dimensions) but is cosmetic priority, not
performance-critical — do it last, after the two real fixes above, and
don't block the PR on it.

**Fix the actual fallback assets, not just the tag.** Swapping `<img>` for
`next/image` on `hero-images.tsx` makes Next's image optimizer serve a
resized/AVIF-or-WebP version on request — but re-encoding a 6.6MB PNG
on-demand at request time is still wasteful. Also **replace the source
files** in `public/images/` with pre-compressed versions (WebP/AVIF, max
1920px wide) before wiring in `next/image` — same `compressImage()`-style
budget the upload pipeline already enforces (see 7.2.3), just applied once,
by hand, to these five oversized static fallbacks.

**Priority order (revised):**
1. `hero-images.tsx` — both tags, **plus replacing the oversized source
   files** (the actual highest-leverage fix in this entire phase)
2. `[slug]/about/page.tsx` — two real photos
3. Decorative SVGs (cosmetic, do last)

**⚠ FIX — "admin/restaurants logos" and "dashboard/settings logo preview"
already use `next/image`.** Grepped directly: zero `<img>` tags exist
outside the six locations above. Drop these from the task list — they're
not gaps.

### Task 7.2.3 — Upload compression pipeline — **architecture mismatch, rewritten**

**⚠ FIX — Sharp has no server-side upload path to attach to.** The plan
assumes every image upload flows through a Next.js API route where a
Node-only native module (Sharp) can process the raw buffer. Grepped every
`storage.from(...)` call in `src/` — there are exactly **two** upload
paths, and neither matches that assumption:

1. **`src/components/dashboard/item-form.tsx`** (dish photos, logo) —
   uploads **directly from the browser to Supabase Storage** via the
   client SDK (`createClient()` from `@/lib/supabase/client`), calling
   `compressImage()` first. This is the dominant, most-used path. **Sharp
   cannot run here** — it's a native Node addon, unavailable in a browser
   bundle. Installing it would add a dependency with zero valid call site
   for this path.
2. **`src/app/api/admin/restaurants/[id]/theme/assets/route.ts`** (Super
   Admin theme logo/hero upload) — the *only* server-side upload route,
   and it **already requires pre-compressed WebP input**
   (`if (file.type !== "image/webp") return apiError(...)`, 3MB cap),
   compressed client-side with the same `compressImage()` before the
   request is sent. There is no raw buffer for Sharp to process — the
   route would just be re-compressing an already-compressed WebP for no
   gain.

**Corrected task: harden the existing client-side compressor instead of
building an unused server pipeline.** `compressImage()`
(`src/lib/image.ts`) resizes to 1280px and encodes once at quality 0.82,
but has no byte-cap retry loop — a very detailed photo can still land
above a reasonable size. Add the same iterative-quality-reduction idea
from the generic plan's `processUpload`, adapted to `canvas.toBlob` (the
only encoder available client-side):

```typescript
// src/lib/image.ts — replace the single toBlob call with an iterative one
const MAX_BYTES = 500_000;
const MIN_QUALITY = 0.5;

async function encodeUnderCap(canvas: HTMLCanvasElement, startQuality: number): Promise<Blob | null> {
  let quality = startQuality;
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  while (blob && blob.size > MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.1;
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  }
  return blob;
}
```

Wire this into `compressImage()` in place of the current single
`canvas.toBlob(resolve, "image/webp", quality)` call. No new dependency,
no dead server code, same guarantee the generic plan wanted (≤500KB WebP
output) via the mechanism that's actually reachable from the one place
uploads happen.

Also tighten `theme/assets/route.ts`'s `MAX_BYTES` from 3MB down to match
(500KB–1MB is plenty for a compressed WebP logo/hero) — cheap, and closes
the gap between what the client aims for and what the server still
accepts.

**Do not** create `src/lib/image-pipeline.ts` or install `sharp`/
`@types/sharp` — there is no call site for either.

### Task 7.2.4 — Remove dead mockup HTML — **already done**

Confirmed via `git status`: all files under `src/` (`Dashboard.html`,
`Order (1).html`, `Reservations Admin - Standalone.html`, etc.) are
already staged as renames into `design-mockups/` at the repo root. Nothing
to do here — just don't undo it.

**Definition of done for 7.2 (revised):**
- [ ] `next.config.ts` has the `formats`/`deviceSizes`/`imageSizes`/`minimumCacheTTL` tuning block
- [ ] `hero-images.tsx`'s two real `<img>` tags → `next/image`, LCP one gets `priority`
- [ ] The 5 oversized files in `public/images/` replaced with compressed WebP/AVIF equivalents
- [ ] `[slug]/about/page.tsx`'s two photos → `next/image`
- [ ] Decorative SVGs converted last, cosmetic priority
- [ ] `compressImage()` gets the byte-cap retry loop; `theme/assets/route.ts`'s cap tightened to match
- [ ] `npm run build` passes
- [ ] PR #13 merged

**Expected lift after 7.2:** likely bigger than the generic plan's 40-60%
estimate for any restaurant still on the default hero — going from a
1.6MB+6.6MB unoptimized pair to two properly-sized WebP/AVIF images is a
order-of-magnitude change, not an incremental one.

---

## 🟠 Phase 7.3 — Lazy Loading Everywhere — two tasks corrected, one narrowed

### Task 7.3.1 — Dynamic imports — mostly accurate, one addition

Accurate as written for Recharts in `/dashboard/analytics` and
`/admin` (`overview-view.tsx`, built this session — `RevenueAreaChart`
equivalent inline `AreaChart`/`BarChart`/donut usage is a good dynamic-import
candidate). Apply the same pattern.

**🔥 Addition the generic plan missed:** `src/components/site/hero-images.tsx`
and `src/components/site/hero-content.tsx` — both rendered **above the
fold, in the LCP-critical path** — `import { motion } from "framer-motion"`
but use **zero `<motion.>` elements** (grepped directly, confirmed dead
imports in both files). This is pure removable weight from the very first
paint, free of any dynamic-import complexity — just delete the unused
import in both files. Framer-motion is genuinely used elsewhere
(`menu-browser.tsx`, `item-dialog.tsx`, `formules-section.tsx` — the
`/[slug]/menu` route, not the homepage), so `optimizePackageImports`
already lets Next code-split those independently; this fix is specifically
about not paying for it on the homepage at all when it does nothing there.

### Task 7.3.2 — Paginate unpaginated admin endpoints — **⚠ FIX: don't do this as written**

The generic plan's instruction would **break existing, deliberate
behavior**. Both routes carry explicit code comments explaining why they
are unpaginated on purpose:

```typescript
// src/app/api/admin/permissions/route.ts
// Deliberately unpaginated (ROADMAP.md Phase 2 Task 2.5): the client's
// "select all" + bulk-apply-to-N-restaurants flow needs every restaurant
// id up front — paginating here without a cross-page selection redesign
// would silently apply bulk changes to only the visible page. Revisit
// once tenant count approaches ~200.

// src/app/api/admin/subscriptions/route.ts
// Deliberately unpaginated (ROADMAP.md Phase 2 Task 2.5): the client
// (subscriptions-view.tsx) computes its summary strip and status filters
// over the full array. Pagination here needs a matching frontend redesign
// ... Revisit once tenant count approaches ~200; today's dataset is a
// handful of rows.
```

Both routes fetch `restaurants`/`subscriptions`/`restaurant_features` —
tables that, per that prior decision, are expected to stay in the dozens
for the foreseeable future (this is a multi-tenant B2B platform, not a
per-user list). Bolting on `?page=&limit=` would silently corrupt the
"select all restaurants, bulk-apply a feature toggle" flow in
`permissions-view.tsx` and the summary strip in `subscriptions-view.tsx` —
exactly the failure mode the original comment warns about.

**Corrected scope: skip this task entirely.** It's not a Phase 7
performance win, it's an unrelated architecture change (client-side
multi-page selection state + server-computed summaries) that was already
consciously deferred once. If tenant count actually approaches ~200,
revisit as its own scoped task with the frontend redesign included — not
as a drive-by pagination bolt-on during a perf pass.

### Task 7.3.3 — Server-side aggregate for admin analytics — narrowed to the one real hotspot

**⚠ FIX — the generic plan's premise ("fetches raw order rows...
potentially 10k+... aggregates in JavaScript") is only half right.**
Read `src/app/api/admin/analytics/route.ts` in full: it's already
`unstable_cache(60)`-wrapped, and most of its logic (MRR/churn/ARPU — pure
functions in `src/lib/analytics-math.ts`, unit-tested; at-risk detection;
franchise tree; recent-signups onboarding step) joins **small** tables
(`restaurants`, `subscriptions`, `profiles` — realistically dozens to a
few hundred rows for this platform) plus `auth.users` via
`getLastSignInMap()`, a separate Admin API call that **cannot be expressed
as a plain Postgres RPC** (it's not queryable through PostgREST/RLS the
same way). None of that is a real performance problem at this scale, and
none of it can move to SQL without losing the auth.users cross-reference.

**The one genuine hotspot:** the `orders` fetch —
`.select("restaurant_id, created_at, total").gte(...).limit(20_000)` — is
the only query that can realistically return thousands of rows, just to
compute a 30-bucket daily revenue series and two per-restaurant order
counts (`ordersByRestaurant`, `orders7dByRestaurant`) in JS.

**Corrected fix: one RPC, not two.** Skip the generic plan's
`get_acquisition_vs_churn` (it buckets `restaurants.created_at` and
`subscriptions.canceled_at` — both tiny tables, already fast in JS, not
worth a migration). Add a single RPC covering exactly the `orders`
hotspot:

```sql
-- supabase/migrations/00NN_analytics_orders_rollup.sql
-- ⚠ Assign the real next number at execution time — see numbering note below.
create or replace function public.get_order_aggregates(days_back int default 30)
returns table (
  restaurant_id uuid,
  day date,
  revenue numeric,
  order_count bigint
) language sql stable security definer set search_path = public as $$
  select restaurant_id, date_trunc('day', created_at)::date as day,
         sum(total) as revenue, count(*) as order_count
  from public.orders
  where created_at >= now() - (days_back || ' days')::interval
  group by restaurant_id, date_trunc('day', created_at)::date;
$$;

grant execute on function public.get_order_aggregates to service_role;
```

Then in `computeAnalytics()`, replace the raw `orders` fetch with
`admin.rpc("get_order_aggregates", { days_back: 30 })` and reshape the
(now tiny — one row per restaurant per active day, not one row per order)
result into `revenueSeries`, `ordersByRestaurant`, `orders7dByRestaurant`
exactly as today. Everything else in the route (DAU/MAU, at-risk,
franchise tree, recent signups) stays exactly as it is — it was never the
problem.

**Also apply the two small hygiene items** from the generic plan that
*are* still valid regardless of the RPC question:
- Round numeric fields server-side before sending (`mrr`, `arpu`, revenue
  series values) — cheap, shrinks payload slightly, avoids float noise in
  the UI.
- `statusCounts`/`planCounts` are already gone — confirmed in the current
  route (comment explicitly notes they were removed as dead payload in
  the prior roadmap pass). Nothing to do here.

### Task 7.3.4 — Below-the-fold deferral on public menu — **rewritten to match actual page structure**

**⚠ FIX — there is no "MenuSections" component, and the full menu list is
not on this page.** `src/app/[slug]/page.tsx` is a 67-line RSC that
renders, in order: `HeroSection` → `SpecialsSection` (**max 4 featured
items**, `items.filter(i => i.in_stock).slice(0, 4)`) → `WelcomeSection`
(conditional) → `ValuesSection` → `TestimonialsSection`. The actual full,
scrollable menu (every category, every item) lives at the separate route
`/[slug]/menu` — already its own code-split bundle by virtue of being a
different Next.js route. There is nothing resembling the plan's assumed
"long menu list on the homepage" to defer.

**Corrected scope:** `ValuesSection` and `TestimonialsSection` are always
rendered unconditionally and are the two components most likely to sit
below the fold on a mobile viewport (after Hero + up to 4 specials +
Welcome). Dynamically import those two:

```typescript
// src/app/[slug]/page.tsx
import dynamic from "next/dynamic";

const ValuesSection = dynamic(() => import("@/components/site/sections/values-section").then(m => m.ValuesSection));
const TestimonialsSection = dynamic(() => import("@/components/site/sections/testimonials-section").then(m => m.TestimonialsSection));
```

Leave `HeroSection`, `SpecialsSection`, and `WelcomeSection` as static
imports — they're above (or just at) the fold and are exactly what should
stay SSR per the plan's own stated rule ("first visible content must be
SSR").

**Also verify** (per the plan's own note): confirm no `<Script
strategy="beforeInteractive">` exists anywhere in `[slug]/layout.tsx` or
`page.tsx` — grepped, none found. Nothing to fix there.

**Definition of done for 7.3 (revised):**
- [ ] Bundle analyzer confirms Recharts chunks split for admin/dashboard analytics
- [ ] Dead `framer-motion` imports removed from `hero-images.tsx` and `hero-content.tsx`
- [ ] `/api/admin/permissions` and `/api/admin/subscriptions` **left unpaginated** (task skipped, documented why)
- [ ] `get_order_aggregates` RPC replaces the raw `orders` fetch in `/api/admin/analytics`; rest of that route untouched
- [ ] `ValuesSection`/`TestimonialsSection` dynamically imported on `[slug]/page.tsx`
- [ ] `npm run build` passes
- [ ] PR #14 merged

---

## 🟡 Phase 7.4 — Lighthouse in CI — accurate, with a numbering + secrets note

**⚠ FIX — the real public restaurant slug is `orendezvous`, not
`o-rendezvous`.** The generic plan's URL list uses a hyphenated slug that
doesn't exist in this database (`select slug from restaurants` — confirmed
live: `orendezvous`, `pizza-rif`, `sushi-bay`, `cafe-atlas`, `nezres`).
`lighthouserc.js`'s URL list must use `/orendezvous`, not `/o-rendezvous`,
or every LHCI run 404s silently and "measures" an error page.

**⚠ FIX (7.4.4) — don't install `axe-cli`.** It pulls in `chromedriver` +
`selenium-webdriver` — old, largely unmaintained, and flagged by `npm
audit` for a high-severity `adm-zip` vulnerability in that chain. This
project already has Playwright's Chromium (used for `e2e/rbac.spec.ts`);
use `@axe-core/playwright` instead — actively maintained, no legacy
Selenium dependency, and reuses the browser binary already present for e2e.

Tasks 7.4.1, 7.4.3, 7.4.4 are accurate as written and can be built
as-is — `lighthouserc.js`, `web-vitals` RUM table, `axe-cli` pass are all
genuinely net-new to this project (confirmed: none of `web-vitals`,
`@lhci/cli`, `axe-cli`, `wait-on` are installed; no `lighthouserc.js` or
`perf-baseline/` exist yet).

**⚠ FIX (7.4.2):** `.github/workflows/ci.yml` already exists (see "What's
already done" above) with a `checks` job (typecheck/lint/test) and a
conditional `e2e` job. Add the `lighthouse` job as a **new job in the same
file**, not a new file — and match its existing pattern of gating
optional/secret-dependent jobs so a fork without `LHCI_GITHUB_APP_TOKEN`
configured doesn't get a permanently-red required check (same reasoning
the `e2e` job already uses for `BASE_URL`):

```yaml
  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    needs: [checks]   # this repo's job is named "checks", not "test"
    if: ${{ vars.LHCI_GITHUB_APP_TOKEN != '' || secrets.LHCI_GITHUB_APP_TOKEN != '' }}
    steps: # ...same as generic plan, with build env vars matching
           # what checks/e2e already use (NEXT_PUBLIC_SUPABASE_URL etc.)
```

**⚠ FIX — migration numbering.** Current head is `0014_kds.sql`. Phase 6
(in progress — only 6.1 landed) has already reserved `0015_table_sessions.sql`
and `0016_labor.sql` in `ROADMAP-PHASE6.md`. Since Phase 7 is being
executed out of order relative to that plan, **do not hardcode migration
numbers here** — the two migrations this phase needs (`get_order_aggregates`
from 7.3.3, and `web_vitals` from 7.4.3) must take whatever the actual next
number is *at the time each is applied*. If Phase 6.2–6.4 land first, these
become `0017`/`0018`; if Phase 7 lands first, they're `0015`/`0016` and
Phase 6's plan needs bumping instead. Check `ls supabase/migrations/` immediately
before writing each migration file, not before.

**One addition:** the `web_vitals` table has no RLS enabled per the
generic plan's own comment ("No RLS needed — written by service role via
API route, read by admin only") — confirm the admin-read route
(`/api/admin/analytics/vitals`) goes through `createAdminClient()` +
`requireSuperAdmin()` (matching every other `/api/admin/*` route in this
codebase), since the table itself has no policy layer to fall back on if
that guard is ever missed.

**Definition of done for 7.4:** unchanged from the generic plan.

---

## Execution note (2026-07-19 run)

All code/schema/config changes across 7.1–7.4 landed and pass `tsc`/
`eslint`/`vitest`/`next build`. The `get_order_aggregates` and
`get_web_vitals_p75` RPCs (migrations `0016`, `0017`) are applied and
verified live against the real database. `next experimental-analyze
--output` was run and confirmed working (real per-route module data).

**Not captured: real Lighthouse/axe scores.** This execution environment
has no system Chrome libraries (`libnspr4`, `libnss3`, etc.) and no `sudo`
to install them — `npx lighthouse` and `@axe-core/playwright` both fail to
launch a browser here. No baseline numbers were fabricated. The CI
`lighthouse` job (a real `ubuntu-latest` GitHub Actions runner, which has
full Chrome deps) will produce real numbers once `LHCI_GITHUB_APP_TOKEN`
is configured as a repo secret — or run `npm run lhci` /
`npx lighthouse http://localhost:3000/orendezvous --preset=desktop` on any
machine with a real Chrome install to get the `perf-baseline/` numbers
Task 7.1.2 asks for.

## What to work on — recommended order

1. **7.2's hero image fix first, standalone if needed** — it's the
   single highest-leverage change in the phase (1.6MB+6.6MB → properly
   sized WebP/AVIF) and has zero dependency on the rest of Phase 7.
   Consider landing it even before 7.1's full baseline if you want an
   early win to compare against.
2. **7.1 Baseline & Budget** — as planned, establishes the numbers
   everything else is measured against.
3. **Rest of 7.2** (config tuning, remaining `<img>` swaps, compressor
   hardening).
4. **7.3** — dead framer-motion imports (free), `get_order_aggregates`
   RPC, below-the-fold dynamic imports. Skip the permissions/subscriptions
   pagination task entirely.
5. **7.4** — Lighthouse CI + RUM, once there's a real baseline to gate
   against.

## Summary of what the generic plan got materially wrong

1. **`next.config.js` doesn't exist — `next.config.ts` does, already partially configured.** (7.1.1, 7.2.1)
2. **HTML mockups are already moved out of `src/`.** (7.2.4 — no-op)
3. **`.github/workflows/ci.yml` already exists** with its own job names/patterns — extend, don't create. (7.4.2)
4. **The real LCP culprit is five oversized static files in `public/images/` (up to 6.8MB), not a vague "images aren't optimized" problem.** Nobody checked file sizes; this is the biggest lever in the phase. (7.2.2)
5. **Decorative inline SVGs aren't a compression problem** — converting them to `next/image` is cosmetic (CLS only), not the performance win the blanket instruction implies. (7.2.2)
6. **There is no server-side raw-image upload path for Sharp to attach to** — the dominant upload flow is client-to-Storage direct, already using a client-side canvas compressor. Installing Sharp would be dead code. (7.2.3)
7. **The admin analytics route's real bottleneck is one query (`orders`, up to 20k rows), not the whole endpoint** — DAU/MAU depends on `auth.users` and can't move to a SQL RPC at all; at-risk/franchise-tree/recent-signups operate on tables too small to matter. One RPC, not two. (7.3.3)
8. **Paginating `/api/admin/permissions` and `/api/admin/subscriptions` would break an existing, documented, deliberate design decision** (bulk-select-all + client-computed summaries) — this task should be skipped, not silently applied. (7.3.2)
9. **There is no "MenuSections" component and no long list on the `[slug]` homepage** — the real menu lives at a separate, already-code-split route. The actual below-the-fold deferral candidates are `ValuesSection`/`TestimonialsSection`. (7.3.4)
10. **Two dead `framer-motion` imports sit directly in the LCP-critical path** (`hero-images.tsx`, `hero-content.tsx`) — a free, zero-risk removal the generic plan had no way to know about. (7.3.1)
11. **Migration numbers can't be hardcoded** — Phase 6 has already reserved `0015`/`0016` for its own remaining work; Phase 7's two migrations must take whatever's actually next at execution time. (7.4.1/7.3.3)

*Everything else — the sub-phase/PR structure, the Lighthouse CI
assertions, the RUM design, the accessibility pass — is accurate for this
repo and preserved as written.*
