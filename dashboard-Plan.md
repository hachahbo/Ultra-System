# Complete the Darna Owner Admin Dashboard

## Context

Darna is a multi-tenant restaurant SaaS (Tangier pilot) — Next.js 16 App Router + TS + Tailwind v4 + shadcn/ui + Supabase (Postgres/Auth/RLS/Storage) + TanStack Query + RHF/zod + framer-motion. French UI, mobile-first (~380px).

The spec's steps 1–3 already exist and work: auth (src/app/login, src/proxy.ts), RLS tenant isolation (my_restaurant_id()/my_role() helpers), dashboard shell + nav, live kitchen view (10s polling + toast), reservations view, menu CRUD with image upload + in-stock toggle, customers page + CSV export. This plan builds the remaining pages and upgrades, reusin↑ the established patterns (api/dashboard/* route style, getSessionContext(), TanStack polling, revalidateTag("menu", "max")).

User decisions: everything in one plan; staff logins created by owner setting email + password directly (↑o email invites).

## Phase 0 — Migration, deps, types

supabase/migrations/0002_admin_dashboard.sql (new):
- public.tables: id uuid PK, restaurant_id FK cascad↑, number text (matches orders.table_number), seats int check 1–30, pos_x/pos_y real check 0–1 (normalized canvas fractions), created_at, unique(restaurant_id, number). RLS: tenant read (no role check — staff nee↑ the map), owner-only write.
- Orders status: drop/re-add orders_status_check → check (status in ('new','preparing','done')). Use drop constraint if exists + verify auto-generated name.  ↑
- reservations.assigned_table_number text (nullable).
- profiles: add "owner read tenant" select policy (owner lists staff; SECURITY DEFINER helpers avoid recursion). No profiles insert/delete policies — sta↑f CRUD goes through service role with explicit owner check.                                              ↑
- Apply via supabase db push (or db reset locally).

Deps: npm i recharts qrcode.react. npx shadcn@latest add alert-dialog skeleton chart. No image-compressio↑ dep (canvas util instead). No dnd lib (framer-motion drag).                                              ↑

src/lib/types.ts: Order.status: "new" | "preparing" ↑ "done"; Reservation.assigned_table_number: string | null; new DiningTable { id; restaurant_id; number: string; seats; pos_x; pos_y }.

src/lib/schemas.ts: add categorySchema, customizationGroupSchema/customizationOptionSchema, restaurantSettingsSchema, tableSchema, staffSchema { email, password min 8 }; extend itemSchema with name_es.

src/lib/dashboard.ts: add requireOwner() → 401 "Non autorisé" / 403 "Réservé au propriétaire". Rule: eve↑y route using createAdminClient() calls requireOwner() first and scopes queries by ctx.restaurant.id (servi↑e role bypasses RLS).

## Phase 1 — Route restructure + Overview

- Move current orders page to src/app/dashboard/orders/page.tsx (<KitchenView/>). ↑
- src/app/dashboard/page.tsx → Overview (server component; staff → redirect("/dashboard/orders")): today cards (orders count, revenue, pending reservations, new customers — date-fns startOfToday,↑Africa/Casablanca assumption documented), out-of-stock amber strip linking to menu, last-5 orders list. Direct RLS server queries in one Promise.all — no API route.                                              ↑
- src/components/dashboard/nav.tsx: tabs — Aperçu (/dashboard exact, ownerOnly), Commandes (/dashboard/orders), Réservations, Menu (ownerOnly), Plus (ownerOnly Sheet → Clients, Statistiques, Table↑, Réglages). Staff see exactly Commandes + Réservations. Bottom bar stays ≤5 items at 380px.   ↑

## Phase 2 — Orders upgrades

- api/dashboard/orders/[id]: PATCH schema → z.enum(["new","preparing","done"]) (staff allowed — they run the kitchen).                              ↑
- kitchen-view.tsx: one-tap flow (new→"Commencer"→preparing→"Marquer terminée"→done);↑filter tabs Actives / Sur place / Livraison / Toutes / Terminées (client-side on the one polled query — Active tab must include preparing).
- src/lib/sound.ts: WebAudio two-tone beep (no binar↑ asset). Volume2/VolumeX header toggle = the required user-gesture unlock; persisted in localStorage("darna-sound"). Fire beep next to the existing unseen-id toast.                           ↑
- List/Map toggle: Map renders shared FloorPlanMap mode="view" (Phase 6 component — build minimal versi↑n here or reorder phases 6→2 at execution time); table with active dine-in order = highlighted, new = pulse↑ badge = order count; tap table → bottom Sheet with its OrderCards (export OrderCard).                      ↑

## Phase 3 — Menu manager completion

- New api/dashboard/categories/[id]/route.ts: PATCH (rename/sort_order), DELETE with 409 guard if category still has items. revalidateTag("menu", "max").      ↑
- Category + item reorder: ChevronUp/Down swap-sort_order (two PATCHes), invalidate query. No dnd.
- items routes: accept name_es, customization_groups↑(zod-validated), sort_order.
- Split menu-manager.tsx: extract item-form.tsx; new↑customization-editor.tsx (useFieldArray: groups → title.fr, required Switch, max_selections; nested options name + price_modifier).
- src/lib/image.ts: compressImage(file, maxDim=1280,↑q=0.82) — createImageBitmap → canvas → toBlob("image/webp"), fallback to original on failure/larger result. Wire into item photo + settings logo uploads.                                       ↑

## Phase 4 — Reservations + Customers

- api/dashboard/reservations/[id]: PATCH accepts status and/or assigned_table_number (nullable).
- reservations-view.tsx: day filter tabs (Aujourd'hu↑ / À venir / Passées); List/Map toggle with date input + 30-min slot select; src/lib/reservations.ts pure helper isTableReserved(...) — reserved if status new|confirmed, same date, same assigned table, slot within ±90 min. "Assigner une table" Dialog → FloorPlanMap free/reserved shading → tap free table ↑ PATCH.
- Customers: keep server page (owner gate + fetch), add client customers-view.tsx — search Input (client-side filter), row click → Dialog with order history via new api/dashboard/customers/[id]/orders (owner check; orders by customer_id + computed total_spent).

## Phase 5 — Settings + Staff (owner-only enforcement)

- src/app/dashboard/settings/page.tsx + settings-form.tsx: RHF/zod restaurant profile (name,↑logo upload → menu-images/${restaurantId}/logo-*.webp, address, hours, phone, whatsapp, currency, base_delivery_fee, about_text) + toggles is_dine_in_enabled/is_delivery_enabled.             ↑
- api/dashboard/restaurant/route.ts: PATCH — requireOwner(), server client (RLS double-check), th↑n revalidateTag("menu", "max") (public site branding/fees).                                     ↑
- Staff: api/dashboard/staff/route.ts GET (profiles + emails via auth.admin.getUserById), POST (auth.admin.createUser({email, password, email_confirm: true}) + profiles insert role=staff; rollback deleteUser on failure). api/dashboard/staff/[id] DELETE (verify target is staff of own restaurant; owner can't delete owners/self). UI: Table + "Ajouter un membre" Dialog↑+ AlertDialog removal.

## Phase 6 — FloorPlanMap + Tables page

src/components/dashboard/floor-plan.tsx — one shared component, three consumers (tables editor / orders m↑p / reservations map):
FloorPlanMap({ tables, mode: "view"|"edit", aspect=4/3,
  getStatus?, pulse?, badge?, onTableTap?, onTableMove? })
Relative container, markers = absolutely-placed motion.div at left/top: pos*100%, sized by seats. Edit: framer-motion drag + dragConstraints={containerRef}, on dragEnd normalize to 0–1 (clamp 0.03–0.97) → onTableMove. Pulse via animate-ping ring. Status colors: active=primary, reserved=destructive/70, free=emerald, selected=ring-primary.

- api/dashboard/tables/route.ts: GET (tenant — staff read), POST (requireOwner(), 409 on duplicate number↑. [id]: PATCH pos/number/seats, DELETE (owner).
- src/app/dashboard/tables/page.tsx + tables-editor.tsx: edit-mode map with optimistic position updates (setQueryData so drag doesn't snap back); add/edit/delete table dialogs.
- qr-cards.tsx: per-table <QRCodeCanvas value="{origin}/{slug}/menu?table={n}" size={512}> → PNG download via toDataURL; "Imprimer tout" via Tailwind print: styles + window.print(); one promo/delivery QR → /{slug}/menu.                   ↑

## Phase 7 — Analytics

- api/dashboard/analytics/route.ts: requireOwner(); ?range=7d|30d|90d; fetch orders in range (explicit .limit(10000) — Supabase defaults to 1000) + customers; aggregate in TS (pilot scale; JSON contract stable if later swapped for RPC). Returns: revenueSeries (day-bucketed; week for 90d), topItems (top 10 from items jsonb), typeSplit, byHour, newVsReturning (first_seen in-range vs before).
- src/app/dashboard/analytics/page.tsx + analytics-view.tsx: range tabs; shadcn chart wrappers — Area (revenue), Bar (orders/day, orders/hour), horizontal Bar (top items), two donuts. Skeletons; single column at 380px.                             ↑

## Verification (per phase + end-to-end)

- Every phase boundary: npx tsc --noEmit + npm run lint. Dev server already on :4000.
- Phase 0: apply migration; insert an order with status preparing succeeds.
- Phase 1: owner sees all tabs, staff sees only Commandes/Réservations; staff hitting /dashboard lands on orders.                                          ↑
- Phase 2: curl PATCH {"status":"preparing"} → 200; place a public test order → beep + map pulse within 10s.
- Phase 3: item with 2 customization groups round-trips into the public item dialog; 5 MB photo stores <300 KB webp.
- Phase 4: assign table via UI; map shows reserved at at slot, free 2h later; customer search + history dialog with total spent.
- Phase 5: POST /api/dashboard/staff as staff → 403; as owner → 201; new staff login is scoped correctly. Tenant isolation re-check: create a second restaurant row + user, confirm it cannot read tenant A's tables/orders/customers.
- Phase 6: create 4 tables, drag, hard-reload → positions persist; downloaded QR opens /{slug}/menu?table=N with table banner.
- Phase 7: curl ...analytics?range=7d | jq matches hand-counted seed orders; page renders at 380px.

## Risks / gotchas

- orders_status_check constraint name is auto-generated — use if exists and verify.
- Nav exact-match: Aperçu takes /dashboard exact; Commandes must use prefix /dashboard/orders or tabs double-highlight.
- Active orders tab must include preparing or in-flight orders vanish.
- WebAudio beep requires the sound-toggle user gesture — it's the unlock, not polish.
- Settings/category routes must revalidateTag("menu", ax") or public site stays stale ~60s.
- This is Next 16 — check node_modules/next/dist/docs/ for revalidateTag/proxy specifics before coding (per

---

# ADDITIONS TO THE PLAN (do not modify anything above)

> **For the coding agent:** these additions are authoritative and must be applied *in addition* to the plan above. If a previous work-plan or session copy of the plan does not include these items, follow this file, not the older copy. When an addition targets a specific phase, apply it inside that phase at execution time — do not run these as a separate pass at the end.

The following are additions and corrections to the plan above. Nothing above is changed. Where an item overlaps a phase, do the addition **inside that phase** at execution time rather than as a separate pass.

## A0. Additions to Phase 0 (migration, types, helpers)

**A0.1 — Persist `orders.total` (blocks Overview + Analytics).**
- Add column: `orders.total numeric(10,2) not null default 0`. Backfill in the same migration: `update orders set total = ( … recomputed from items jsonb … )` for existing rows, or seed 0 if the table is empty at pilot start.
- Public order-creation route must compute and write `total` on insert (base_price × qty + Σ customization price_modifier × qty, + delivery_fee for delivery). Do not recompute at read time.
- Overview "today's revenue" and Analytics `revenueSeries` both `sum(total)` from this column. No jsonb math at read time anywhere.

**A0.2 — Central timezone helper (prevents midnight drift).**
- New `src/lib/time.ts` exporting `TZ = "Africa/Casablanca"`, `startOfTodayCasa()`, `endOfTodayCasa()`, `dayBucket(date)` (returns the yyyy-mm-dd string in Casa TZ), `slotKey(date, minutes=30)`.
- Every place that buckets or filters by day MUST import from here: Overview cards, Reservations day filter (`Aujourd'hui / À venir / Passées`), Analytics `revenueSeries` day buckets, `isTableReserved`. No inline `startOfToday()` from `date-fns` in components.
- Verification: place an order at 23:45 Casa time and confirm it appears in *today's* Overview count, not tomorrow's.

**A0.3 — Optimistic-concurrency columns.**
- Add `updated_at timestamptz not null default now()` on `tables` and `orders`.
- Trigger (or explicit set) on any update: `updated_at = now()`.
- Used by A2.1 and A6.1 below.

**A0.4 — Staff onboarding fields on `profiles`.**
- Add `must_change_password boolean not null default false`.
- Add `consented_at timestamptz` (owner records staff consent — see A5.1).

## A1. Additions to Phase 1 (Overview)

**A1.1 — Overview reads from `orders.total`.**
- "Revenue today" card = `sum(orders.total) where created_at >= startOfTodayCasa()`. Not computed from `items` jsonb.
- All day boundaries use A0.2 helpers.

## A2. Additions to Phase 2 (Orders)

**A2.1 — Concurrency-safe status PATCH.**
- Client sends the last-known `updated_at` in the PATCH body.
- Server: `update orders set status=$1, updated_at=now() where id=$2 and updated_at=$3 returning *`. If 0 rows, return **409** with the current row so the client can `setQueryData` and re-prompt. Prevents two staff both "completing" an order into an inconsistent flow.
- TanStack: on 409, invalidate + toast "Commande déjà mise à jour — actualisation".

**A2.2 — Build order: `FloorPlanMap` before the map toggle.**
- Resolve the plan's "Phase 6 component — build minimal version here or reorder phases 6→2" note by **reordering**: build `FloorPlanMap` in `mode="view"` as the first step of Phase 2 (extracted to `src/components/dashboard/floor-plan.tsx`), then extend it with `mode="edit"` in Phase 6. Do not write a throwaway "minimal version" that then diverges from the real component.

**A2.3 — iOS Safari beep verification.**
- Verification addendum for Phase 2: after enabling sound via the header toggle, hard-reload the page on iOS Safari and confirm the next incoming order still beeps without re-toggling. If iOS re-locks the AudioContext across reloads (it can), persist a "sound armed" flag in `localStorage` and re-prompt the user to tap the toggle once per session with a small "Activer le son" chip in the header, rather than silently failing.

## A3. Additions to Phase 3 (Menu)

**A3.1 — QR size + error correction for print.**
- (Moved into Phase 6 execution, kept here for cross-reference.) See A6.2.

*(No other changes to Phase 3.)*

## A4. Additions to Phase 4 (Reservations + Customers)

**A4.1 — Reservation map shows seat counts.**
- `FloorPlanMap` marker in reservation mode renders the table number **and** seat count (e.g. `T5 · 4p`). Keep the free/reserved binary shading as planned — do not try to auto-hide tables where `party_size > seats`. Let the owner decide; a 6-seat table for a party of 2 is a valid seating choice.

**A4.2 — Customers list row-count ceiling.**
- Header of `customers-view.tsx` shows `${count} clients`. Client-side `ilike`-style filter is fine for pilot. **When `count > 2000`**, swap the filter to a server-side search via `api/dashboard/customers?q=…` (owner-gated, `.ilike("name", …)` + `.ilike("phone", …)`, `.limit(50)`). Not built now; leave a `// TODO(scale): server-side search at >2000 rows` next to the filter.

## A5. Additions to Phase 5 (Settings + Staff)

**A5.1 — Staff consent (CNDP / Law 09-08).**
- "Ajouter un membre" Dialog: required checkbox "Ce membre du personnel a consenti à la création de ce compte" — block submit until checked.
- POST `/api/dashboard/staff` sets `profiles.consented_at = now()` on insert.

**A5.2 — Force password change on staff first login.**
- POST `/api/dashboard/staff` sets `profiles.must_change_password = true`.
- Middleware / dashboard shell: if `session.user` has `must_change_password = true`, redirect all `/dashboard/*` requests to `/dashboard/change-password` until they set a new one (server route calls `auth.admin.updateUserById` then clears the flag).
- Owners never get this flag.

## A6. Additions to Phase 6 (FloorPlanMap + Tables)

**A6.1 — Concurrency-safe table position PATCH.**
- Same pattern as A2.1: client sends last-known `tables.updated_at`; server updates only if it matches; 409 on mismatch → invalidate query and refetch (so the marker doesn't snap back over a peer's edit).
- Optimistic UI stays as planned; the 409 handler just replaces the optimistic state with the server's truth.

**A6.2 — QR quality for real-world print.**
- Change `<QRCodeCanvas size={512}>` to `size={1024}` and `level="H"` (high error correction). PNG file size stays trivial; scan reliability on cheap thermal-printed Glovo flyers goes up materially.

**A6.3 — RLS re-verification after `tables` lands.**
- The tenant-isolation cross-check listed in Phase 5 verification (`create restaurant B, confirm cannot read A's tables/orders/customers`) must be **re-run** after Phase 6 migration too — because `tables` is a new surface introduced later. Extend the same script; do not skip.

## A7. Additions to Phase 7 (Analytics)

**A7.1 — Analytics uses `orders.total` directly.**
- `revenueSeries` = group by `dayBucket(created_at)` (from A0.2) and `sum(total)`. Do not recompute totals from `items` jsonb in the aggregator.

**A7.2 — Timezone in day buckets.**
- Day/week bucketing uses A0.2 helpers, not `date-fns` UTC defaults. The 90d "week" bucket is `startOfWeek(date, { weekStartsOn: 1 })` **after** shifting into Casa TZ. Verification: `curl ...analytics?range=7d | jq` and hand-count against orders you inserted at 23:50 Casa — they must fall on the correct day, not UTC's next day.

## A8. Additions to Verification

- **Phase 0:** insert an order at 23:45 Casa time → appears in Overview "today" cards.
- **Phase 2:** two browser sessions PATCH the same order; the second gets 409 and refetches cleanly.
- **Phase 2 (iOS):** sound survives a hard reload OR re-prompts via chip (per A2.3).
- **Phase 5:** creating a staff account without ticking the consent checkbox → 400. First login of a fresh staff account lands on `/dashboard/change-password` and cannot bypass.
- **Phase 6:** two browser sessions drag the same table; second drag gets 409, marker snaps to the winning position, no lost update. Re-run the tenant-isolation script including the new `tables` table.
- **Phase 7:** `revenueSeries` day totals equal the sum of `orders.total` for that Casa day, not UTC day.

## A9. Additions to Risks / gotchas

- **`orders.total` must be written at order-creation time** by the public route. If it defaults to 0 and nobody writes it, Overview + Analytics will silently show zero revenue and nobody will notice for weeks. Add a runtime `zod` refinement on the insert path: `total > 0` unless the order is empty (which should itself be a 400).
- **Timezone drift is silent.** Any component that imports `startOfToday` / `startOfWeek` from `date-fns` directly instead of via `src/lib/time.ts` is a bug in waiting. Add an ESLint `no-restricted-imports` rule blocking those two names from `date-fns` outside `src/lib/time.ts`.
- **Optimistic concurrency 409s are the correct outcome, not an error state.** The kitchen tablet will hit them during a rush. The UX must be "refresh + toast", never a red error dialog.
- **Staff `must_change_password` gate must live in the server layout / route handler, not just middleware** — middleware can be bypassed by direct API calls. Every `api/dashboard/*` handler should also check the flag and 403 if set, to force the change before any mutation.
- **CNDP posture reminder:** the "Export customers (CSV)" button and the staff consent checkbox together are your two visible signals that this is the restaurant's data, collected with awareness. Do not remove or hide either to "clean up the UI".
- **Pre-existing unrelated type errors** in `src/components/site/hero-content.tsx` may show up in `tsc --noEmit` output. Leave them or fix them in a separate commit — do NOT let them mask new type errors introduced by this plan. Per phase boundary, diff the tsc output against a known baseline of pre-existing errors so a genuinely new error isn't lost in the noise.