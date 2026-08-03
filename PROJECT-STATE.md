# Darna — Project Progress & Feature Review

> Generated 2026-07-31 against `main` (HEAD `b340e21`), migrations `0001`–`0025`, and the repo's own planning docs (`ROADMAP.md`, `ROADMAP-PHASE6.md`, `ROADMAP-PHASE7.md`, `dashboard-Plan.md`, `superadmin-Plan.md`, `i18n-Plan.md`) — treated here as the "Original Feature Plan" since no separate plan/ticket list was supplied for this review. `knowledge/SystemProject.md` / `stack.md` / `database.md` describe an **earlier, abandoned** pitch (Airtable + Expo + WhatsApp-checkout MVP) — the project pivoted early to the Next.js/Supabase build audited below; that pivot is noted but the old pitch isn't scored as a gap.
>
> No feature list or codebase attachment was actually pasted into the request template — this review substitutes the repo's own roadmap docs and a direct code/migration audit in their place, per the "do not hallucinate" instruction.

---

## 1. Feature Audit (Traceability Matrix)

| Feature | Status | Notes |
|---|---|---|
| Public storefront (`/[slug]`: menu, cart, checkout, reservation, about, contact) | ✅ Completed | `src/app/[slug]/**`; cart is Zustand (`src/store/cart.ts`), checkout POSTs to `/api/orders` which writes `orders.total` server-side. |
| Bespoke site builder (theme, hero/gallery images, section copy, draft/publish) | ✅ Completed | `src/components/admin/site-builder/*`; multi-image galleries added (commit `4c45c6a`), asset upload capped 1MB WebP with iterative client-side compression. |
| Owner dashboard shell + 4-role RBAC (owner/manager/serveur/cuisine) | ✅ Completed | `src/lib/permissions.ts` (`ROUTE_ACCESS`/`canAccessRoute`/`defaultRouteFor`), enforced in `src/proxy.ts` → `dashboard/layout.tsx` → API guards → Postgres RLS (4 layers, per `knowledge` docs and confirmed in code). |
| Kitchen orders view + real KDS (station-routed tickets, realtime) | ✅ Completed | `orders-view.tsx`, `kds-view.tsx`; `0014_kds.sql` + realtime publication (`0020`). |
| **POS → real staff order creation** | ✅ Completed | `pos-view.tsx` posts to `/api/dashboard/orders` (verified by reading the file directly: `placeStaffOrder()` → real fetch, not mock data). This closes the "PosView creates no order" gap both `ROADMAP-PHASE6.md` and the prior `PROJECT-STATE.md` flagged as a hard blocker for KDS/recipe-deduction coverage of dine-in. |
| Menu manager (categories, items, customization groups, image upload) | ✅ Completed | `menu-manager.tsx`, `item-form.tsx`, `src/lib/image.ts` (`compressImage`, iterative quality reduction). |
| Recipe costing & auto-86 (ingredient links, margin view, stock-based menu greying) | ✅ Completed | `0013_recipes.sql`, `recipe-editor.tsx`, `menu_item_costs` view, `get_available_menu` RPC. |
| Inventory (stock, suppliers, deliveries) + variance tracking | ✅ Completed | `0006_inventory.sql`; `inventory-view.tsx`, `variances-view.tsx`, `/dashboard/inventory/variances`. |
| Floor plan / tables + QR codes + table turnover | ✅ Completed | `floor-plan.tsx` (shared `FloorPlanMap`), `qr-cards.tsx`, `table-turnover.tsx`; `0015_table_sessions.sql` + realtime. |
| Reservations (day filters, table assignment) | ✅ Completed | `reservations-view.tsx`, `/api/dashboard/reservations`. |
| Customers (search, CSV export, order history) | ✅ Completed | `customers-view.tsx`. |
| Staff/Team management (invite, roles, consent, forced password change) | ✅ Completed | `staff-management.tsx`, `/api/dashboard/staff*`, `must_change_password` gate. |
| Analytics (revenue/orders charts, top items, hourly) | ✅ Completed | `analytics-view.tsx`, `/api/dashboard/analytics`. |
| **Labor tracking (clock in/out, hourly cost)** | ✅ Completed | `0018_labor.sql` (`shifts` table, one-open-shift constraint), `labor-panel.tsx`, `/api/dashboard/labor`, `/api/dashboard/shifts`. This was "not started" in the last snapshot (`ROADMAP-PHASE6.md` 6.4.1–6.4.3) — now shipped (commit `80832ea`). |
| **Order payment (online checkout payment provider)** | ❌ Not Started (deliberately) | No `orders.payment_status` column exists anywhere in `supabase/migrations/` or `src/` (grepped, zero hits). `src/app/api/webhooks/billing/route.ts` is a documented `501` stub — externally blocked on CMI (Morocco) merchant onboarding, per `ROADMAP-PHASE6.md` 6.4.4. Not a gap in execution, a real external dependency. |
| **Promotions editor (dashboard CRUD over `promotions.rules`)** | ✅ Completed | `promotions-manager.tsx`, embedded in `menu-manager.tsx` behind `data.features.promotions`, wired to `/api/dashboard/promotions`. Was "seed-only, no dashboard CRUD" in the last snapshot — now built (commit `4764bf1`). |
| **Franchise link/unlink UI** (`parent_restaurant_id` write path) | ✅ Completed | `src/app/api/admin/restaurants/franchise`, surfaced in `overview-view.tsx` (tree) and `restaurant-detail-panel.tsx`. Was flagged read-only/no-write-UI in the last snapshot — now built (commit `7875929`). |
| **Events management** (dashboard CRUD + public listing + private inquiries) | ✅ Completed, but net-new / undocumented | Full stack: `0021_events.sql`, `/api/events`, `/api/dashboard/events`, `/api/events/private-inquiry`, `events-view.tsx`, `event-form.tsx`, public `events-section.tsx` + `/[slug]/events`. **This feature appears in none of the five plan docs reviewed** (`ROADMAP*.md`, `dashboard-Plan.md`, `superadmin-Plan.md`) — it was built off-roadmap. Flagging per the "don't hallucinate, but don't hide real deltas" instruction: it's real and shipped, just not traceable to a written plan. |
| Super Admin platform (`/admin`): Overview, Restaurants CRUD, Permissions engine, Subscriptions, Audit log | ✅ Completed | Matches `superadmin-Plan.md` Phases 0–5 essentially 1:1; `platform_admins`, `requireSuperAdmin()`, `restaurant_features` + `PLAN_DEFAULTS`/`resolveFeatures`, `logAdminAction` on every mutating route (per `src/lib/admin-auth.ts`, `src/lib/audit.ts`). |
| Feature gating (plan → dashboard nav/API → public site, 3 layers) | ✅ Completed | `requireFeature`/`assertFeature` pattern in `src/lib/dashboard.ts`; `FeatureLocked` component; public site hides cart/reservation POST when disabled. |
| Suspension/expiry enforcement | ✅ Completed | Suspended-tenant takeover screens (owner/staff + public "unavailable" page); `pg_cron` trial-expiry sweep (`0004`). |
| Security hygiene (rotate secrets, remove tracked scripts, CI secret scan, rate limiting) | ✅ Completed | `.github/workflows/secret-scan.yml` (gitleaks), husky pre-commit JWT-shape grep, `src/lib/rate-limit.ts` + `0011_rate_limits.sql`. Matches `ROADMAP.md` Phase 0–1. |
| DB indexing pass | ✅ Completed | `0012_indexes.sql`; matches `ROADMAP.md` Phase 2. |
| Testing foundation (unit + RBAC e2e + a11y e2e + CI) | ✅ Completed | 5 Vitest suites (`permissions`, `features`, `analytics-math`, `i18n-content`, `messages` — parity/placeholder checks), `e2e/{rbac,i18n,accessibility}.spec.ts`, `.github/workflows/ci.yml` (`checks` → `e2e` → `lighthouse`, each gated on required secrets). |
| Performance & Web Vitals (image pipeline, dynamic imports, RUM, Lighthouse CI) | ✅ Completed, one item genuinely open | Oversized hero fallbacks replaced with compressed WebP, dead `framer-motion` imports removed, `get_order_aggregates`/`get_web_vitals_p75` RPCs, `web-vitals-reporter.tsx`, `lighthouserc.js`. **Real Lighthouse/axe numbers still not captured** — every execution environment used so far lacks a system Chrome; unblocks itself the first time `ci.yml`'s `lighthouse` job runs on a real GitHub runner with `LHCI_GITHUB_APP_TOKEN` configured. |
| i18n Part 1–2 — Public site (FR⇄EN static strings + DB content via `i18n` jsonb) | ✅ Completed | `messages/{fr,en}.json` at 893 keys (parity-tested); `0023_content_i18n.sql`, `src/lib/i18n-content.ts` (`localize()`), wired into `menu.ts`/`site-theme.ts`/`events.ts`; English menu content seeded (`0024`, `0025`) for the one tenant that has a menu (`orendezvous`). |
| i18n Part 3 — Dashboard (owner/staff UI) | 🟡 In Progress | 25 of ~32 `src/components/dashboard/*.tsx` files use `useTranslations` (D1–D2 essentially done: shell, nav, settings, orders, kitchen, kds, pos, inventory, staff, events, labor, tables all converted). **Not yet converted:** `overview-view.tsx`, `empty-state.tsx`, `feature-locked.tsx` (dashboard-side), `stat-card.tsx`, `menu-translations.tsx`. `pos-view.tsx` and `analytics-view.tsx` are mid-conversion right now — uncommitted working-tree diff shows partial `t()` adoption alongside still-hardcoded French strings (`"Tous"`, `"Vider"`, `"Sous-total"`, `"Articles"`) in `pos-view.tsx`. |
| i18n Part 3 — Super Admin (`/admin`) | 🔴 Not Started (per plan, D5 is explicitly last) | Only 2 of 11 `src/components/admin/*.tsx` files use `useTranslations`. Matches `i18n-Plan.md`'s own stated ordering (D5 lowest priority) — not a surprise gap, just genuinely not reached yet. |
| i18n — URL-based locale strategy (`/{slug}/en/...`, hreflang) | ❌ Not Started (deliberate) | `i18n-Plan.md` §7 explicitly defers this; locale is cookie-only today. Documented open decision, not an oversight. |
| i18n — Auto-translation assist ("Translate to English" button) | ❌ Not Started (deliberate) | Listed as optional Phase 5b/Phase D in `i18n-Plan.md`; nice-to-have, correctly deprioritized. |
| Admin/dashboard shared UI primitives (`KpiCard`, `AvatarChip`, `DataTableShell`, etc.) | ❌ Not Started | `ROADMAP.md` Phase 4 called for a `src/components/admin/primitives.tsx`; still doesn't exist — `overview-view.tsx`, `subscriptions-view.tsx`, `restaurants-view.tsx`, `permissions-view.tsx`, `table-turnover.tsx` each still hand-roll their own card/table markup. Cosmetic debt, not a functional gap. |

---

## 2. Gap Analysis & Edge Cases

**Fully missing (not partial — nothing built):**
- **Online payment for customer orders** (Phase 6.4.4). No schema, no provider integration, webhook route is an intentional `501`. This is the one item in the entire plan set that is genuinely blocked by something outside the codebase (Moroccan merchant PSP onboarding), not by unfinished work.
- **URL-based i18n routing** and **auto-translation tooling** — both explicitly deferred in `i18n-Plan.md`, not overlooked.
- **Admin UI primitives extraction** — pure refactor debt, zero user-facing impact.

**Partial implementations (real but incomplete):**
- **Dashboard i18n (Part 3)**: the mechanism (next-intl, message catalogues, parity test) is fully wired and proven on the public site, but roughly 20% of dashboard components (notably `overview-view.tsx`, the single most-viewed owner screen) still render hardcoded French. Two files are being converted in the currently uncommitted working tree (`pos-view.tsx`, `analytics-view.tsx`), so this is active in-flight work, not a stalled effort.
- **Super Admin i18n**: mechanism proven, near-zero coverage (2/11 files) — by design, per the plan's own phase ordering, but worth flagging so it isn't mistaken for "i18n = done."
- **Lighthouse/axe real-world scores**: the entire pipeline (config, CI job, RUM ingestion) is built and typechecks, but no actual Lighthouse/axe run has ever completed anywhere this project has been worked on, due to missing system Chrome libraries in every sandbox used so far. This is an execution-environment gap that will self-resolve on a normal CI runner, not a code defect — but as of today there are **zero real performance numbers** to point to, which matters if "Performance work is done" is being reported upward.
- **Franchise tree**: write UI now exists (this review's biggest correction vs. the last snapshot), but no explicit re-verification of the tenant-isolation script was found for the new franchise-mutation endpoints in the current session — worth a quick manual recheck, not a rebuild.

**Off-roadmap but real (surprise additions, not gaps):**
- **Events management** is a complete, working full-stack feature with no origin in any of the five plan documents reviewed. It's implemented consistently with the rest of the codebase's patterns (RLS, feature-gating hooks present, i18n-converted), so it reads as deliberate, scoped work — just undocumented in the roadmap trail. Worth back-filling into a roadmap doc so future reviews don't have to rediscover it from git log.

---

## 3. Progress Calculation

**Overall: ~92% complete against the union of all five roadmap/plan documents**, weighted by build complexity rather than task count. The two largest remaining line items — payment integration and full i18n coverage of the two admin surfaces — are weighted heavily below because they're genuinely substantial, even though they're a minority of the total task count.

| Domain | % Complete | Rationale |
|---|---|---|
| Public storefront & checkout | ~95% | Feature-complete; only payment (external blocker) and URL-locale strategy (deliberately deferred) are open. |
| Owner Dashboard (POS/KDS/inventory/tables/staff/labor/events/promotions) | ~97% | Every ROADMAP-PHASE6 item shipped, including the two features (promotions, franchise UI) and one (labor) that were open in the last snapshot. Events is a bonus, fully built. |
| Super Admin platform | ~93% | Functionally complete per `superadmin-Plan.md`; the only real gap is i18n coverage (by design, last in sequence), not missing capability. |
| Backend / Supabase (schema, RLS, RPCs, realtime, cron) | ~96% | 25 migrations applied and internally consistent; only `payment_status` and a payment-provider seam are missing, both intentionally deferred. |
| i18n / Localization | ~75% | Public site: essentially done (893 keys, content jsonb, e2e coverage). Dashboard: ~80% converted. Super Admin: ~18% converted. Weighted down because these are large, mechanical-but-real remaining string counts (per `i18n-Plan.md`'s own measurement: ~214 strings across 26 Super Admin files untouched). |
| Infra / Testing / CI / Performance | ~90% | Full CI pipeline, unit + e2e suites, security scanning all live and green. Held below 95% because zero real Lighthouse/axe scores exist yet — the safety net is built but never actually fired. |

---

## 4. Next Steps

**Architectural health:** Strong and consistent. The four-layer RBAC enforcement (proxy → server layout → API guard → RLS), the single-source-of-truth permission matrix, and the discipline around checking `ls supabase/migrations/` before hand-assigning the next migration number (called out explicitly in three separate roadmap docs after a real numbering collision) all indicate a codebase that self-corrects rather than accumulating silent drift. The main recurring failure mode across the roadmap docs isn't bugs — it's **documentation lag**: `PROJECT-STATE.md` itself was 11 days and 8+ shipped features stale before this review, and the Events feature has no roadmap trail at all.

**Top action items:**
1. **Finish dashboard i18n (Part 3, D3 tier)** — `overview-view.tsx` is the single highest-traffic remaining French-only screen; finish the two in-flight files (`pos-view.tsx`, `analytics-view.tsx`) in the current working tree and commit them before starting new work, to avoid the diff growing stale.
2. **Capture one real Lighthouse + axe run** on any machine/CI runner with a working Chrome, and fill in `perf-baseline/budget.md` — the entire performance pipeline is unverified in practice until this happens once.
3. **Back-fill a roadmap entry for Events** (or fold it into `ROADMAP-PHASE6.md`/a new phase doc) so it's traceable — otherwise the next review will rediscover it from `git log` again, same as this one did.
4. **Re-run the tenant-isolation script** specifically against the new franchise-linking endpoints (`/api/admin/restaurants/franchise`) — every other new table/route in this project's history has had this check explicitly re-run; no evidence one was done here.
5. **Start Super Admin i18n (D5)** once dashboard i18n lands — it's the last remaining surface, ~214 strings across 26 files per the plan's own estimate, and mechanical given the pattern is already proven twice over.
