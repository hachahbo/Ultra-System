# Ultra-System — Original Brief vs. Shipped Reality

> Audit date 2026-07-31 · `main` @ `b340e21` · migrations `0001`–`0025`
> Source of truth for "planned": the original *Direct Ordering Web App for Moroccan Restaurants* brief (Glovo profit-recovery strategy, sales hooks, Invisible Waiter, deal-closers, `menu.json` blueprint).
> Source of truth for "built": the actual `src/` tree, `supabase/migrations/`, and git history — verified by grep, not by trusting `knowledge/*.md`.

---

## 0. Headline

**The platform is far more capable than the brief asked for — but it is missing almost every feature the brief designated as a *sales hook*.**

The build went deep on **restaurant operations** (POS, KDS, inventory, recipe costing, labor, floor plan) and shallow on **customer acquisition & retention** (WhatsApp, loyalty, catering, payments). Those four missing pieces are precisely the ones the brief said would close a Moroccan restaurant owner. This is a go-to-market risk, not a code-quality risk.

| Lens | Score |
|---|---|
| Brief's **core ordering platform** delivered | ~95% |
| Brief's **four sales hooks / deal-closers** delivered | ~10% |
| Brief's **trilingual (fr/es/ar) tourist promise** delivered | ~40% (diverged to fr/en) |
| Scope **beyond** the brief | ~+200% (an entire restaurant ERP + SaaS control plane) |

---

## 1. The Pivot That Obsoleted Half the Brief

The brief's "Critical MVP Gaps" section proposed fixes for an **Airtable/Google-Sheets + Expo + WhatsApp-string-URL** architecture. That stack was abandoned early (it survives only as a stale description in `knowledge/SystemProject.md` / `stack.md` / `database.md`). The shipped stack is **Next.js App Router + Supabase Postgres + RLS**.

Every brief-identified MVP gap was therefore solved *structurally* rather than by the proposed workaround:

| Brief's Gap | Brief's Proposed Fix | What Actually Shipped | Verdict |
|---|---|---|---|
| "Out of Stock" crisis — static `menu.json` needs a dev commit | Use Google Sheets / Airtable as no-code DB | Postgres `items.in_stock` + owner dashboard toggle + **auto-86 from live ingredient stock** (`0013_recipes.sql`, `get_available_menu` RPC) | ✅ **Exceeded** — the brief wanted a manual phone toggle; the system now greys out dishes automatically when an ingredient runs out |
| Multi-tenant URL routing — one `menu.json` = one client | Nest all restaurants in one JSON, read slug on mount | True multi-tenancy: `src/app/[slug]/**` + `restaurant_id` on every table + Postgres RLS isolation | ✅ **Exceeded** — real tenant isolation, not JSON namespacing |
| WhatsApp string/URL character limits truncating orders | Write a strict string formatter with terse emojis | Non-issue — checkout POSTs JSON to `/api/orders` (`checkout-client.tsx:65`); orders never travel as URL text | ✅ **Obsolete by design** |
| `menu.json` relational blueprint (`customization_groups`, localized name objects) | Nested JSON structure | `items.customization_groups jsonb` — kept *verbatim* from the blueprint (`0001_init.sql:56`). Localized names became `name_ar`/`name_es` columns | ✅ Delivered (localization later diverged — see §4) |

**Takeaway:** the brief's Section "🛠️ System Architecture & Strategic Assessment" is now a historical document. Don't treat its fixes as an open backlog.

---

## 2. Delivered — Brief Promises That Are Live

| Brief Feature | Status | Evidence |
|---|---|---|
| Mobile-optimized direct ordering web app, zero download | ✅ | `src/app/[slug]/menu`, `/cart`, `/checkout`; Zustand cart (`src/store/cart.ts`) |
| Multi-tenant SaaS, per-restaurant slug URLs | ✅ | `src/app/[slug]/**`, RLS on every tenant table |
| **"Invisible Waiter" — unique QR per table, hidden `?table=` param** | ✅ **Fully delivered** | `qr-cards.tsx:50` generates `/{slug}/menu?table={n}`; `menu-browser.tsx:170` binds it to the cart; `cart.ts:18` carries it; orders land as `type='dine_in'` with `table_number` (`0001_init.sql:72`) |
| **Live visual 2D floor-plan map for waitstaff/kitchen** | ✅ **Delivered + exceeded** | `floor-plan.tsx` (shared `FloorPlanMap`), `tables-editor.tsx`, plus a real **KDS with station routing and realtime push** (`0014_kds.sql`, `0020_realtime_*.sql`) — the brief only asked for a flashing table map |
| QR table menu replaces printed menus | ✅ | `qr-cards.tsx` printable cards, `tables-editor.tsx:327` per-table URL |
| Dine-in **and** delivery modes, per-restaurant toggles | ✅ | `is_dine_in_enabled` / `is_delivery_enabled`, `base_delivery_fee` (`0001_init.sql:20-22`) |
| **"Export Customer Data (CSV)" — the data-ownership trust play** | ✅ | `src/app/api/dashboard/customers/export/route.ts` + `customers-view.tsx`; per-customer order history at `customers/[id]/orders` |
| Customer names / phones / order history owned by the restaurant | ✅ | `customers` table keyed per tenant; searchable in dashboard |
| Menu updates are digital, real-time, 0 MAD | ✅ | `menu-manager.tsx`, `item-form.tsx`, image upload w/ WebP compression (`src/lib/image.ts`) |
| Item customization groups driving upsell / higher AOV | ✅ | `customization_groups` jsonb, priced modifiers, exactly per blueprint |
| Flat monthly SaaS pricing in MAD, monthly/yearly | ✅ | `subscriptions.price_mad` + `billing_cycle`; MRR math in `src/lib/analytics-math.ts`; Super Admin subscriptions view |

---

## 3. Missing — Never Built (verified by grep, zero hits)

These are the brief's **revenue and retention hooks**. All five are absent from `src/` and `supabase/`.

### 🔴 3.1 WhatsApp Marketing Engine — **NOT BUILT**
The brief's Sales Hook #2 ("business runs entirely on WhatsApp; email is near-zero open rate in Morocco").

- **What exists:** `restaurants.whatsapp_number` is a *stored contact string only* — rendered as a click-to-chat link on contact/reservation/events pages.
- **What's missing:** no WhatsApp Business API client, no transactional order confirmation, no delivery tracking link, **no "One-Click Broadcast" button** in the dashboard.
- **Grep:** every `whatsapp` hit in `src/` is a form field, a schema key, or a `wa.me` display link. No outbound messaging code anywhere.
- **Impact:** the brief's single strongest emotional trigger ("I can text my customers anytime to fill empty tables") cannot currently be demoed.

### 🔴 3.2 Digital Stamp Card / Automated Loyalty — **NOT BUILT**
The brief's Deal-Closer #2 (phone-number-based invisible visit counter → automatic free-dessert WhatsApp at 5th order).

- **Grep for `loyalty|stamp_card|points|reward` across `src/` and `supabase/`: zero real hits** (only false positives in `rate-limit.ts` and `0022_hero_images.sql`).
- The raw material exists — `customers` is keyed by phone and order history is queryable — but no counter, no threshold, no reward issuance, no redemption.

### 🔴 3.3 Corporate Catering / Bulk Pre-Ordering — **NOT BUILT**
The brief's Sales Hook #4 (min order value ~500 DH + 24h notice → high-margin bulk tickets Glovo can't serve).

- **Grep for `catering|preorder|pre_order|minimum_order|min_order`: zero hits repo-wide.**
- No checkout toggle, no minimum-value enforcement, no lead-time constraint, no scheduled-order concept. Orders are immediate-only.
- *Adjacent but not a substitute:* the **Events** feature (`0021_events.sql`, `/api/events/private-inquiry`) handles private-event *inquiries* — closest existing surface to build catering on.

### 🔴 3.4 "No-Click" WhatsApp AI Bot (Darija/Arabic/French) — **NOT BUILT**
Deal-Closer #3 (Watbot-style ordering by text/voice note). No bot, no NLU, no webhook. Depends on 3.1 landing first.

### 🔴 3.5 Customer Payment — COD + CMI — **NOT BUILT**
The brief's Sales Hook #1, "The Cash Flow Accelerator" — arguably the brief's #1 financial pitch.

- **`orders` has no `payment_status`, no `payment_method`, no COD flag** — grep across all 25 migrations returns nothing. Even *cash* is unmodeled; an order carries no notion of whether it was paid.
- `src/app/api/webhooks/billing/route.ts` + `src/lib/billing/provider.ts` are a documented `501` stub — and critically, that seam is for **SaaS subscription billing (restaurant → you)**, *not* customer → restaurant payment. These are two different problems; the customer-payment one has no seam at all.
- CMI integration is externally blocked on Moroccan merchant onboarding, but **COD is not blocked by anything** and is unbuilt.

### 🟡 3.6 Local Courier / Delivery Logistics — **STUB ONLY**
The brief's economics depend on "customer pays local courier 15 DH." `base_delivery_fee` + `orders.delivery_fee` exist and are charged, but there is no courier assignment, no dispatch, no tracking link, no last-mile API integration.

### ⚪ 3.7 Native iOS/Android via Expo — **NOT STARTED (correctly)**
Explicitly Phase 2 in the brief, gated on a loyal user base. Not a gap today.

---

## 4. Diverged — The Trilingual Tourist Promise

The brief's Deal-Closer #1 ("Tangier Tourist Auto-Translate"): menu **auto-detects browser language**, renders in **Spanish / French / Arabic**.

**What shipped instead: French ⇄ English, cookie-selected, manually toggled.**

| Brief promise | Reality | Gap |
|---|---|---|
| Spanish + Arabic + French | `messages/` contains **only `fr.json` + `en.json`**; `src/i18n/config.ts:4` → `locales = ["fr","en"]` | ❌ No `es`, no `ar` — the two languages the tourist pitch named |
| Auto-detect phone browser language | **Zero hits** for `Accept-Language` / `navigator.language` in `src/` | ❌ Locale is cookie-only; tourist must find and press a switcher |
| RTL support for Arabic | No `dir="rtl"` handling found | ❌ Not started |

**Schema debt — two competing translation systems now coexist:**
- `0001_init.sql` created `categories.name_ar` / `name_es` and `items.name_ar` / `name_es` (straight from the brief's blueprint). These are still wired end-to-end — Zod schemas, API routes, `item-form.tsx:57-58` — so owners can *type* Arabic and Spanish names today.
- `0023_content_i18n.sql` introduced a **different** mechanism: a per-locale `i18n` jsonb column, currently populated for `en` only. Its own header comment explicitly flags the conflict: *"contrast categories.name_ar / name_es from 0001_init.sql, which never gained an `en` sibling."*
- **Net effect:** Arabic/Spanish data can be entered but is not rendered by the current `localize()` resolver, while English lives in a separate column shape. Anyone adding `es`/`ar` must first decide which system wins.

---

## 5. Added — Built Well Beyond the Brief

None of the following appear anywhere in the original brief. This is where the engineering effort actually went:

| Addition | Evidence | Strategic read |
|---|---|---|
| **Full staff POS** | `pos-view.tsx` → `/api/dashboard/orders` | Moves the product from "ordering widget" toward replacing the restaurant's till |
| **Kitchen Display System** w/ station routing + realtime | `kds-view.tsx`, `0014_kds.sql`, `0020` | Brief only wanted a table map |
| **Inventory**: stock, suppliers, deliveries, variance tracking | `0006_inventory.sql`, `inventory-view.tsx`, `variances-view.tsx` | Whole new product surface |
| **Recipe costing + margin analysis + auto-86** | `0013_recipes.sql`, `recipe-editor.tsx`, `menu_item_costs` view | Real ERP territory |
| **Labor tracking** — clock in/out, shifts, hourly cost | `0018_labor.sql`, `labor-panel.tsx` | Supports the brief's "reduce labor cost" claim with actual data |
| **Table sessions & turnover analytics** | `0015_table_sessions.sql`, `table-turnover.tsx` | Quantifies the Invisible Waiter pitch |
| **Reservations** | `reservations-view.tsx`, `0020` realtime | Not in brief |
| **Events management** (public listing + private inquiries) | `0021_events.sql`, `events-view.tsx` | Not in brief; closest base for catering (§3.3) |
| **Bespoke site builder** — themes, hero/gallery, draft/publish | `src/components/admin/site-builder/*`, `0019`, `0022` | Turns each tenant into a real website, not just a menu |
| **Super Admin control plane** — restaurants CRUD, permissions engine, subscriptions, audit log | `0003_super_admin.sql`, `src/lib/admin-auth.ts`, `src/lib/audit.ts` | The brief never described how *you* operate the SaaS |
| **Plan-based feature gating** (free / pro / enterprise × 11 feature keys) | `src/lib/features.ts:12` | Monetization ladder the brief's flat pricing never specified |
| **4-role RBAC, 4-layer enforcement** (proxy → layout → API → RLS) | `src/lib/permissions.ts` | Brief assumed a single owner user |
| **Franchise / multi-location groups** | `0009_franchise_groups.sql`, franchise link UI | Not in brief |
| **Security & quality infra** — rate limiting, gitleaks CI, RLS everywhere, Vitest + Playwright + a11y + Lighthouse CI | `0011`, `.github/workflows/*` | Not in brief |

---

## 6. Verdict & Recommended Sequence

**Architectural health: strong.** Multi-tenancy, RLS, feature gating, and RBAC are consistent and layered. Nothing here needs rescuing.

**Product health: misaligned with the sales thesis.** The brief argued the system wins because it (a) recovers Glovo margin, (b) accelerates cash flow, (c) markets over WhatsApp, and (d) locks in loyalty. The codebase currently delivers (a) — and, of (b)/(c)/(d), *none*. Meanwhile it has grown an inventory/recipe/labor ERP the brief never asked for.

**If the goal is still "close Tangier restaurants," build in this order:**

1. **Order payment state + Cash on Delivery.** Add `payment_method` / `payment_status` to `orders`. COD needs no external dependency and unblocks the entire "money in your till tonight" pitch. Model the CMI seam behind the same interface for when merchant onboarding clears.
2. **WhatsApp transactional messages.** Order confirmation on `/api/orders` success. Highest-visibility, smallest surface — and the prerequisite for both broadcasts and the bot.
3. **WhatsApp broadcast button.** `customers` already holds the phone list; this is a dashboard action + send loop. This is the demo that closes owners.
4. **Loyalty counter.** Count orders per `customers.phone`, threshold → reward. Cheap given existing data; pairs with #2 for the automated "free dessert" moment.
5. **Resolve the `name_ar`/`name_es` vs `i18n` jsonb split**, then add `es` + `ar` with `Accept-Language` detection. Required before any tourist-facing claim; currently the pitch overstates the product.
6. **Catering pre-order mode** — min order value + lead time on checkout. Build on the Events inquiry surface rather than net-new.
