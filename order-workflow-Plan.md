# Role-Based Order Workflow — Implementation Plan

> Verified against `main` (HEAD `c84f7c6`, migrations `0001`–`0029`) by reading the actual files. Every `file:line` reference below was accurate at the time of writing.
>
> **Objective:** a four-role order lifecycle — Customer submits from the QR menu → Waiter approves → Kitchen prepares → Kitchen marks ready → Waiter serves — where each role sees only the data and actions its job needs.

---

## 1. Verdict — roughly 70% of this already exists

This is not a greenfield feature. The roles, the QR intake, the KDS, the realtime transport and the notification bell are all built and working. The flow stops one step short of the brief and, more seriously, **wires two of its stages to the wrong triggers**.

| Piece | State | Where |
|---|---|---|
| 4 roles `owner`/`manager`/`serveur`/`cuisine` | ✅ Done | `profiles.role` — `0008_team_roles.sql`; `src/lib/permissions.ts:9` |
| Route guard + per-role landing page | ✅ Done | `src/proxy.ts:66,96`; `defaultRouteFor()` — `permissions.ts:81` |
| Customer QR menu with `?table=N` | ✅ Done | `src/app/[slug]/menu/page.tsx:19-41` |
| Per-item custom notes | ⚠️ Hacky | `src/components/menu/item-dialog.tsx:168` — appended into `options[]` as `"Note: …"` |
| Order intake: price recompute, table validation, promo re-resolve | ✅ Solid | `src/app/api/orders/route.ts` |
| KDS: stations, tickets, station fan-out, live subscription | ✅ Done | `0014_kds.sql`; `src/components/dashboard/kds-view.tsx:101-122` |
| Realtime on `orders` + `kds_tickets` | ✅ Done | `0020_realtime_orders_reservations.sql`; `0014_kds.sql` |
| Notification bell + sound + seen-tracking | ✅ Done | `dashboard-header.tsx:140-171`; `src/lib/notifications.ts`, `seen-orders.ts` |
| Table sessions auto-seat / auto-vacate | ✅ Done | `0015_table_sessions.sql` |
| Payment state, orthogonal to fulfilment | ✅ Done — **do not touch** | `0026_order_payments.sql` |

---

## 2. The five real gaps

### P0 — The chef sees the order before the waiter approves it

`orders_fan_to_kds` fires **`after insert on public.orders`** (`0014_kds.sql:134-136`). The KDS ticket is created the instant the customer taps "Commander". There is no window in which a waiter could approve anything, because by then the food is already on the kitchen screen.

This single trigger is the reason the brief's stage 2 does not exist. Everything else in this plan is downstream of moving it.

### P1 — The status enum is 3 states, not 5

`orders.status` is `'new' | 'preparing' | 'done'` (`0002_admin_dashboard.sql:54-55`). The brief needs `pending → confirmed → preparing → ready → served`. No `confirmed`, no `ready`, no `served`, and no cancellation path for an order the waiter rejects because an item is 86'd.

### P2 — "Ready" never travels back to the waiter

The chef's bump writes `kds_tickets.status = 'bumped'` and stops (`src/app/api/dashboard/kds/[id]/route.ts:20`). It never touches `orders`, so there is nothing for a waiter alert to fire on.

The bell feed compounds this: `src/app/api/dashboard/notifications/route.ts` reports only *newly created* orders, pending reservations and pending event inquiries — **the same list for all four roles**, guarded by `requireSession()` alone (`:23`). A waiter and a chef currently see identical notifications.

### P3 — Any role can set any status, in any order

`PATCH /api/dashboard/orders/[id]` guards with `requireSession()` (`:20`) — authenticated, tenant-scoped, but **no role check and no transition validation**. A `cuisine` account can move an order straight `new → done`. The zod schema (`:7`) accepts any of the three states unconditionally.

### P4 — The waiter has no waiter screen

`defaultRouteFor("serveur")` lands on `/dashboard/orders` (`permissions.ts:84`) — a 1,233-line `@tanstack/react-table` grid built for a desktop back office, polling every 10s (`orders-view.tsx:124`). No approve action, no availability check, no mobile queue, no ready-to-serve lane.

### Housekeeping

`src/components/dashboard/kitchen-view.tsx` is **dead code** — nothing imports it. The only surviving references are three stale comments (`api/dashboard/tables/route.ts:6`, `api/dashboard/tables/turnover/route.ts:8`, `src/lib/tables-query.ts:3`). Delete it in this pass rather than migrating its status literals.

---

## 3. Target state machine

```
   CUSTOMER            WAITER              KITCHEN            WAITER
   (QR menu)           (serveur)           (cuisine)          (serveur)
       │                   │                   │                  │
       ▼      approve      ▼    trigger        ▼                  │
  ┌─────────┐         ┌───────────┐       ┌───────────┐           │
  │ pending │────────►│ confirmed │──────►│ preparing │           │
  └─────────┘         └───────────┘fan-out└───────────┘           │
       │                                        │                 │
       │ reject                all tickets      │                 │
       │ (86'd)                bumped           ▼                 │
       ▼                                   ┌─────────┐   deliver  │
  ┌───────────┐                            │  ready  │◄───────────┘
  │ cancelled │                            └─────────┘
  └───────────┘                                 │
                                                ▼
                                           ┌──────────┐
                                           │  served  │
                                           └──────────┘
```

**`confirmed → preparing` is one DB transaction, not a second click.** The approve trigger fans out to `kds_tickets` and advances the status atomically. Both states are persisted so the timeline records who approved and when the kitchen actually received it — see §7 for the alternative that was rejected.

### Transition authority

| Transition | Actor | Mechanism |
|---|---|---|
| `∅ → pending` | customer (anon) | `POST /api/orders` — service role |
| `∅ → confirmed` | `serveur`+ | `POST /api/dashboard/orders` (POS) — a waiter taking the order at the table **is** the approval |
| `pending → confirmed` | `serveur`, `manager`, `owner` | `PATCH /api/dashboard/orders/[id]` |
| `pending → cancelled` | `serveur`, `manager`, `owner` | reject — item unavailable |
| `confirmed → preparing` | **system** | Postgres trigger, same txn |
| `preparing → ready` | **system**, when every station ticket is bumped | trigger on `kds_tickets` |
| `ready → served` | `serveur`, `manager`, `owner` | `PATCH /api/dashboard/orders/[id]` |

The `ready` derivation matters. An order fans out to *N* station tickets — hot line, cold, bar (`0014_kds.sql:79-131`). It is ready only when **all** of them are bumped. A per-order "Ready" button would let the cold station declare a table's food ready while the grill is still working.

### Notification routing

| Event | → `serveur` | → `cuisine` | → `owner`/`manager` |
|---|---|---|---|
| order `pending` | 🔔 **"Table 4 — à approuver"** | — | 🔔 |
| order `preparing` | — | 🔔 new ticket (KDS already live) | — |
| order `ready` | 🔔🔊 **"Table 4 — prête à servir"** | — | — |
| order `served` | — | — | 🔔 |

Realtime is already published on `orders`, and `dashboard-header.tsx:142-152` already subscribes to `event: "*"` on that table. This is a role-aware branch in the notifications route plus a filter on an existing subscription — **no new infrastructure**.

---

## 4. Phase 0 — Migration `0030_order_workflow.sql`

One migration, applied with `supabase db push`. Order matters: backfill before the constraint swap, trigger move before the new triggers.

**Status column**
- Drop `orders_status_check` (auto-generated-name-safe `do $$` block, same pattern as `0002_admin_dashboard.sql:39-52` and `0008_team_roles.sql:15-27`).
- Backfill: `new → pending`, `done → served`. `preparing` keeps its name but changes meaning — it now implies the waiter approved.
- Re-add: `check (status in ('pending','confirmed','preparing','ready','served','cancelled'))`.
- Change the column default from `'new'` to `'pending'`.

**Lifecycle stamps** — `confirmed_at`, `confirmed_by`, `ready_at`, `served_at`, `served_by` (`uuid references public.profiles(id) on delete set null`, mirroring `paid_by` in `0026_order_payments.sql`). Backfill `served_at = created_at` for historical rows so the waiter-performance view is not null-poisoned on day one.

**Move the fan-out trigger** (the P0 fix)
- `drop trigger orders_fan_to_kds on public.orders;`
- Recreate as `after update on public.orders for each row when (new.status = 'confirmed' and old.status is distinct from 'confirmed') execute function public.fan_order_to_kds();`
- Inside `fan_order_to_kds`, after the ticket loop, add `update public.orders set status = 'preparing', updated_at = now() where id = new.id;` — same transaction, so a confirmed order with no KDS ticket cannot exist.
- The function body itself is otherwise correct and stays as-is, including the `item_id` and `options` fixes it documents.

**New: `sync_order_ready_from_tickets()`** — `after update on public.kds_tickets`, fires when `new.status = 'bumped'`. Counts unbumped siblings for `new.order_id`; when zero, sets `orders.status = 'ready'`, `ready_at = now()`. Guard on `old.status is distinct from 'bumped'` so a re-bump is a no-op.

**New: `enforce_order_transition()`** — `before update on public.orders`, rejects any `old.status → new.status` pair not in the table in §3. Belt-and-braces behind the API guard: the RLS update policy (`0001_init.sql:163`) is tenant-scoped but role-blind, so a compromised or careless client is otherwise free to write nonsense.

**Repoint the session vacate** — `auto_vacate_table_session` tests `new.status = 'done'` (`0015_table_sessions.sql:77`). Change to `'served'`, or table turnover analytics silently stops recording.

**Index** — `create index orders_restaurant_status_idx on public.orders (restaurant_id, status, created_at desc);` The waiter queue filters on exactly this.

Close with `notify pgrst, 'reload schema';` per house convention.

### Found during implementation — three additions this plan originally missed

**Move `auto_deduct_inventory` onto approval too.** It also fires `after insert on public.orders` (`0013_recipes.sql:189`). That was defensible while every order eventually reached `done`, but introducing `cancelled` means a waiter rejecting an 86'd item leaves the deducted stock gone with no restock path. Same WHEN clause as the KDS fan-out; the function body needs no change.

**Rebuild `orders_open_idx`.** It is a *partial* index predicated on `status <> 'done'` (`0012_indexes.sql:8`). After the backfill nothing is ever `'done'`, so the predicate matches every row — the index silently degrades from "open orders only" into a full, useless copy of the table. Rebuild as `where status not in ('served','cancelled')`.

**Filter cancelled out of `get_order_aggregates`.** The RPC (`0016`) sums `total` with no status filter, which was correct while every order was real. A cancelled order carries a non-zero `total` and would inflate admin revenue and order counts. The app-side revenue sums (`src/lib/dashboard-stats.ts`, the analytics route) have the same hole and are **deferred to Phase 4**.

**Handle orders that are *born* approved.** Discovered while implementing Phase 2: the fan-out trigger fires on a transition *into* `confirmed`, but the POS route inserts `confirmed` directly — and an INSERT fires no UPDATE trigger, so such an order would sit at `confirmed` for ever, never reaching the kitchen and never deducting stock. Section 4b adds mirror `after insert … when (new.status = 'confirmed')` triggers, plus a `before insert` guard restricting the initial status to `pending` or `confirmed` (otherwise an order could be INSERTed straight as `served`, skipping the workflow entirely). `OLD` cannot be referenced in an INSERT trigger's `WHEN` clause, so these must be separate triggers rather than one `INSERT OR UPDATE`.

### Implementer's note for Phase 2

Because the `confirmed → preparing` advance happens in an AFTER UPDATE trigger, an `update … returning *` that writes `'confirmed'` gets `'confirmed'` back — the nested update lands after the RETURNING snapshot is taken. Verified against Postgres 16: RETURNING says `confirmed`, the row is `preparing`. `PATCH /api/dashboard/orders/[id]` must re-select after approving rather than trusting its own RETURNING.

### Verification

The full chain `0001` → `0030` was replayed against Postgres 16 in Docker with a minimal Supabase shim (`auth.uid()`, `auth.users`, `storage.*`, the `supabase_realtime` publication, `cron.*` stubs), seeded with orders in all three old statuses, then exercised end-to-end: backfill, approve → auto-fan-out → stock deduction, partial vs. complete station bump, serve → session vacate, all four illegal transitions rejected, the cancel path leaving stock untouched, and a late bump failing to resurrect a cancelled order.

One pre-existing defect surfaced and was **not** fixed (out of scope): `0013_recipes.sql:195` already adds `orders` to the `supabase_realtime` publication, and `0020_realtime_orders_reservations.sql:10` adds it again — so a clean `supabase db reset` fails at `0020` with *"relation orders is already member of publication"*. Worth a follow-up.

---

## 5. Phase 1 — Shared flow module

**New — `src/lib/order-flow.ts`.** Pure and dependency-free, same contract as `permissions.ts`: importable from API routes, server components and client components alike.

```ts
export type OrderStatus =
  | "pending" | "confirmed" | "preparing" | "ready" | "served" | "cancelled";

// Actor-driven transitions only. confirmed→preparing and preparing→ready
// are system transitions (Postgres triggers) and are deliberately absent —
// no client may write them.
export const ORDER_TRANSITIONS: Record<OrderStatus, { to: OrderStatus; roles: Role[] }[]>

export function canTransition(role: Role, from: OrderStatus, to: OrderStatus): boolean
export function isActive(status: OrderStatus): boolean   // pending…ready
export const ORDER_STATUS_LABELS: Record<OrderStatus, string>  // message keys, not text
```

Unit-test it alongside `permissions.test.ts` — the state machine is the kind of logic that is cheap to test and expensive to get wrong in a dining room.

---

## 6. Phase 2 — API layer

**`src/app/api/dashboard/orders/[id]/route.ts` — the weakest link, rewrite the PATCH guard**
- `requireSession()` → `requireRole(["owner","manager","serveur","cuisine"])`.
- Read the current row first, then `canTransition(ctx.profile.role, current.status, next)`; reject with **409** and the current order (the route already has this shape at `:57-63` for the optimistic-concurrency case, so the client's conflict handling is reusable).
- Stamp `confirmed_by` / `served_by` from `ctx.profile.id`.
- Keep the `updated_at` optimistic-concurrency check (`:41-43`) — two waiters approving the same ticket is a real race on a busy Friday.
- Widen the zod enum (`:7`) to the six states.

**`src/app/api/dashboard/orders/route.ts` (POS)** — the insert (`:129`) sets no status, so it defaults to `pending`. Under the new flow a waiter typing the order at the table *is* the approval: set `status: "confirmed"` explicitly and let the trigger take it to `preparing`. Without this, a POS order sits in the waiter's own approval queue waiting for its author.

**`src/app/api/dashboard/kds/[id]/route.ts`** — no change needed. The bump already writes `bumped`; the new trigger derives `ready`. Consider narrowing `requireRole` (`:10`) to drop `serveur`, since bumping is now the kitchen's assertion that the dish is done.

**`src/app/api/dashboard/notifications/route.ts`** — role-aware feed per the §3 table. Branch on `guard.ctx.profile.role`; `serveur` gets `pending` + `ready` (with `href: "/dashboard/service"`), `cuisine` gets `preparing`, `owner`/`manager` get everything. Add `"order_ready"` to the `NotificationItem["kind"]` union (`:15`) so the header can style and sound it differently.

**New — `POST /api/dashboard/items/[id]/availability`.** Lets a `serveur` mark an item 86'd during approval. It needs its own route because `items` write RLS is owner/manager-only (`0008_team_roles.sql:50-53`) and column-level RLS in Postgres is more trouble than a narrowly-guarded route: `requireRole([...,"serveur"])`, accept `{ in_stock: boolean }` only, scope by `ctx.restaurant.id`, then `revalidateTag("menu", "max")` like the sibling item routes.

---

## 7. Phase 3 — The waiter screen

**New — `src/app/dashboard/service/page.tsx`** (server guard, mirroring `src/app/dashboard/kds/page.tsx:13-19`) **and `src/components/dashboard/service-view.tsx`.**

Three lanes, mobile-first at ~380px, thumb-sized targets, live-subscribed to `orders` via the `kds-view.tsx:101-122` channel pattern:

| Lane | Filter | Actions |
|---|---|---|
| **À approuver** | `status = 'pending'` | per-line availability toggle → `Approuver` / `Refuser` |
| **En cuisine** | `status in ('confirmed','preparing')` | read-only, elapsed timer |
| **Prêt à servir** | `status = 'ready'` | `Servi` — one tap |

The "Prêt à servir" lane is the delivery vehicle for the P2 alert: a realtime `UPDATE` landing on `status = 'ready'` moves a card into the lane, fires the toast and plays the existing `src/lib/notification-sound.ts` chime.

Reuse rather than rebuild: `seen-orders.ts` for unread tracking, `motion.tsx` for lane transitions, `empty-state.tsx` for the quiet-service case.

**Routing** — in `permissions.ts`: add `{ prefix: "/dashboard/service", roles: ["owner","manager","serveur"] }` to `ROUTE_ACCESS` (above the `/dashboard/orders` entry, since the list is most-specific-first per `:21`), and change `defaultRouteFor` (`:84`) so `serveur` lands here instead of the back-office grid. Add the nav entry to `app-sidebar.tsx` in `groupOperations` next to KDS.

### Decisions taken during implementation

**`Order["status"]` in `types.ts` was NOT widened here.** Widening it is a one-line change that immediately breaks the build in 16 places across `orders-view`, `overview-view`, `status-dot` and the dead `kitchen-view` — i.e. it drags all of Phase 4's surfacing work into Phase 3. `service-view.tsx` instead declares its own local `ServiceOrder` projection, which is the pattern `kds-view.tsx` already establishes for exactly this reason. Phase 4 widens the type and fixes those 16 sites together, as originally sequenced.

**`seen-orders.ts` was not reused.** It tracks *unread* orders for the bell badge, keyed by order id. The service board has no unread concept — a card is either in a lane or it is not — so wiring it in would have added state with nothing reading it. The ready-chime instead keeps a `useRef` set of known-ready ids, seeded silently on first load so a waiter opening the page mid-service is not hit with a chime for every order already up.

**The `["orders"]` query key is shared with `orders-view.tsx` deliberately.** Both fetch `/api/dashboard/orders` and read `.orders`, so the cache entry is compatible, and `dashboard-header.tsx:142-152` already invalidates that key on every realtime order change — the service board gets the header's subscription for free on top of its own. Availability uses `["menu-availability"]`, distinct from orders-view's `["menu"]`, because it stores a different projection.

**Notification hrefs flipped** — the Phase 2 handoff note is now discharged: `pending` and `ready` order notifications point at `/dashboard/service`, `preparing` at `/dashboard/kds`, and `served` at the back-office grid.

**Two lint rules bit and were fixed rather than mirrored.** `react-hooks/purity` rejects `Date.now()` during render, which `kds-view.tsx:61,185` does today. The board owns a single lazily-initialised `now` (`useState(() => Date.now())` passes the rule; a bare call does not) and passes it to every card, so one timer drives the whole board's age colouring instead of each card reading the clock mid-render.

---

## 8. Phase 4 — Surfacing the new states

- **`src/lib/types.ts:334`** — widen `Order["status"]` to the six-state union; add the five new lifecycle columns.
- **`orders-view.tsx`** — `STATUS_MAP` (`:71-73`) needs three new entries; `type Filter` (`:67`), `editStatus` (`:113`), `handleBulkStatusChange` (`:215`) and the status-picker grid (`:963`) all hardcode the old triple. Bulk actions should now route through `canTransition` rather than writing any status to any selection.
- **`overview-view.tsx:380-384`** — a three-branch ternary over `done`/`preparing`/`new`; replace with `ORDER_STATUS_LABELS`.
- **`kds-view.tsx`** — no logic change. Once the trigger moves, unapproved orders simply never produce tickets. Optionally surface `order.status` on the card so the line cook can see an order that has gone `ready` on another station.
- **`messages/fr.json` + `en.json`** — new keys under `Orders` and a new `Service` namespace. `src/lib/messages.test.ts` enforces key parity across both catalogues; a key added to one and not the other fails the suite.
- **Delete `src/components/dashboard/kitchen-view.tsx`** and correct the three stale comments that name it.
- **`e2e/crud.spec.ts:216`** patches an order to `"preparing"` directly — under the new state machine that is an illegal client transition and the test must approve instead.

### Decisions taken during implementation

**The status picker and bulk actions now derive their options from the machine.** Both previously hardcoded the three old states. The edit modal offers the current status plus `allowedTransitions(role, current)`; the bulk toolbar offers the *intersection* of allowed targets across the selection, so a mixed selection (some pending, some ready) correctly offers only what they share rather than firing a batch the machine will half-reject. `OrdersView` takes a `role` prop for this — it previously only knew `canSettlePayment`.

**Bulk updates now report partial failure.** The old handler `Promise.all`-ed the PATCHes and toasted success unconditionally; a 409 from a concurrent update was invisible. It now counts `res.ok` and warns with `n/total` when they differ.

**A pre-existing mislabelling surfaced and was fixed.** `STATUS_MAP` labelled `preparing` as `"ready"` and `new` as `"inProgress"` — harmless while those were the only three states, actively wrong once `ready` became a real, separate state. All labels now route through `ORDER_STATUS_LABELS`.

**The revenue hole is closed in both KPI paths**, not just the RPC: `src/app/dashboard/page.tsx` (overview revenue series + order counts) and `src/app/api/dashboard/analytics/route.ts` (revenue series + top-items ranking) both now `.neq("status", "cancelled")`, and `orders-view`'s revenue stat filters the same way. Verified end-to-end: a single rejected 8,910 MAD order would otherwise have reported 9,220 MAD of revenue instead of the true 310.

The recent-activity list on the overview deliberately still shows cancelled orders — it is a log, not a KPI.

**A post-Phase-4 audit found five MORE money sites with the same hole**, all missed because the original plan scoped the fix to the tenant dashboard and forgot `/api/admin/*` entirely:

| Site | What was inflated |
|---|---|
| `api/admin/restaurants/route.ts:50` | per-restaurant monthly revenue (Super Admin list) |
| `api/admin/restaurants/route.ts:94` | platform-wide monthly revenue summary |
| `api/admin/restaurants/[id]/route.ts:36,43` | one restaurant's revenue series **and** its lifetime order count |
| `api/dashboard/customers/[id]/orders:27` | customer lifetime spend (`total_spent`) |
| `api/dashboard/orders/reconciliation` | `outstandingTotal` — money nobody owed |

Reconciliation got the subtler treatment: a cancelled **unpaid** order is excluded from outstanding, but a cancelled **paid** one stays in `collectedTotal` — that is real cash in the till against a refund due, and hiding it would stop the till balancing. The customer's order history still lists cancelled orders; only the spend total excludes them.

---

## 9. Explicitly out of scope

**`payment_status` stays strictly orthogonal to fulfilment.** `0026_order_payments.sql` is emphatic that these must never collapse: a `served` order can legitimately be `unpaid` (a dispute), and a cash order is commonly `served` + `paid`. No transition in §3 touches a payment column, and `/dashboard/orders/reconciliation` stays owner/manager-only (`permissions.ts:35`).

---

## 10. Two calls worth overruling if you disagree

**Persisting both `confirmed` and `preparing`.** The brief says "Preparing: triggered automatically when confirmed", which invites collapsing them into one state. Keeping both costs one enum value and buys a real audit trail — approve-time versus kitchen-receipt-time is exactly the number you want when a table complains about a 40-minute wait and you need to know whether the delay was front-of-house or the line. If you would rather have five states than six, drop `confirmed` and have the approve action write `preparing` directly; the trigger moves to `when (new.status = 'preparing')` and nothing else in this plan changes.

**`ready` derived from ticket completion rather than a chef button on the order.** With multiple stations this is the difference between "the food is ready" and "one station's share of the food is ready". If a tenant runs a single station, the two are identical and the trigger costs nothing.

---

## 11. Execution order

1. **Phase 0** — migration. Nothing else works until the trigger moves.
2. **Phase 1** — `order-flow.ts` + tests. Pure, no dependencies, unblocks everything downstream.
3. **Phase 2** — API guards. Closes P3 (the open PATCH) before any new UI can exercise it.
4. **Phase 3** — waiter screen. The visible deliverable; closes P0/P2/P4.
5. **Phase 4** — status surfacing, i18n parity, dead-code removal, e2e fix.

Verify against a real tenant with a real floor plan — the intake route rejects a `?table=` value that does not match a row in `tables` (`api/orders/route.ts:79-88`), so a seeded restaurant with no tables cannot produce a dine-in order to approve.
