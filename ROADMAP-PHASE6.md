# Darna — Phase 6: Restaurant-OS Depth (project-matched)

> Adapted from the generic "Phase 6" against the **actual** repo state
> (migrations `0001`–`0012` all applied, verified 2026-07-19). Strategy and
> sequencing are kept — they're sound. Every SQL block in the original was
> written against a guessed schema and **would fail on this database**;
> corrections are marked `⚠ FIX`.
>
> Reference docs in this repo: `PROJECT-STATE.md`, `ROADMAP.md` (Phases 0–5,
> now landed). The generic plan's `state-of-project.md` doesn't exist.

---

## What's already done (don't rebuild)

| Plan assumes needed | Actual status |
|---|---|
| `my_role_can_manage()` for RLS | ✅ exists (`0008_team_roles.sql`) |
| `set_updated_at()` trigger fn | ✅ exists (`0010_churn_and_integrity.sql`) — recipes/KDS can reuse it |
| Inventory tables + `unit_price_mad`/`stock`/`min_threshold` | ✅ exists (`0006_inventory.sql`) — recipe costing builds on this |
| Cuisine role + `defaultRouteFor` + `ROUTE_ACCESS` | ✅ exists (`0008` + `src/lib/permissions.ts`) |
| A "kitchen view" of orders | ✅ partial — `orders-view.tsx` has a basic list; 6.2 replaces it with a real KDS |
| Billing provider seam | ⚠️ **exists but for the wrong thing** — `src/lib/billing/provider.ts` is a **subscription-billing** seam (restaurant pays Darna: `createSubscription/changePlan/cancel`). Phase 6.4.4 needs a **customer-order-payment** seam (`initiatePayment/verifyWebhook`) — a genuinely new, separate interface. |
| Supabase Realtime (for KDS) | ❌ **never used anywhere** in this project — needs the tables added to the `supabase_realtime` publication (a migration step the plan omits entirely). |
| Staff-created (POS) orders reaching the kitchen | ❌ **`PosView` creates no order** — its "Placer la commande" only clears the cart + toasts, hits no API. See the KDS dependency note below. |

---

## 🔴 Migration numbering — the plan collides with landed work

⚠ **FIX (applies to the whole plan):** Phases 0–5 already shipped through
**`0012_indexes.sql`**. The generic plan's `0012_recipes` / `0013_kds` /
`0014_table_sessions` / `0015_labor` all collide or misorder. Correct numbers:

| Plan | Corrected |
|---|---|
| `0012_recipes.sql` | **`0013_recipes.sql`** |
| `0013_kds.sql` | **`0014_kds.sql`** |
| `0014_table_sessions.sql` | **`0015_table_sessions.sql`** |
| `0015_labor.sql` | **`0016_labor.sql`** |

Apply each the same way `0007`–`0012` were: direct `pg` connection via the
`aws-0-eu-west-1` pooler (there's no local Supabase stack).

---

## 🔴 Phase 6.1 — Recipe Costing (`0013_recipes.sql`)

Strategy unchanged (highest ROI, unlocks margins/menu-engineering/auto-86).
But the plan's SQL has **five schema bugs that each break it**:

1. ⚠ **`inventory_items.unit_cost` does not exist** → the column is
   **`unit_price_mad`**. Every `inv.unit_cost` in the cost view/joins must be
   `inv.unit_price_mad`.
2. ⚠ **`items.name` does not exist** → it's **`name_fr`**. `i.name` in the
   `menu_item_costs` view must be `i.name_fr`.
3. ⚠ **Order-line field is `item_id`, not `id`** → the deduction trigger reads
   `line->>'id'`, which is **always NULL** here (real shape:
   `{item_id, name, quantity, unit_price, options}`). Every line would be
   skipped → the trigger silently does nothing. Must read `line->>'item_id'`.
4. ⚠ **`stock` has `CHECK (stock >= 0)`** (`0006`) → the plan's "log and keep
   going" on negative stock is **impossible**: `set stock = stock - x` where
   the result is < 0 **throws**, which (in an `AFTER INSERT` trigger) **aborts
   the whole order** — the exact opposite of "customer must not be blocked."
   Fix: clamp with `greatest(stock - deduction, 0)` and still log the variance.
5. ⚠ **`menu_item_costs` view leaks across tenants.** A plain view is
   effectively `SECURITY DEFINER` — with `grant select … to authenticated` it
   bypasses RLS, so any signed-in user reads **every restaurant's** food
   costs. On PG17 (this DB) add **`with (security_invoker = on)`** so the
   view runs under the caller's RLS.

Corrected core of `0013_recipes.sql`:
```sql
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id uuid not null references public.items(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(12,4) not null check (quantity > 0),
  unit text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (menu_item_id, inventory_item_id)
);
-- indexes + RLS (read: my_restaurant_id(); write: my_role_can_manage()) as in the plan
create trigger recipes_touch_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();   -- fn already exists (0010)

-- cost view — FIXED column names + tenant-safe
create view public.menu_item_costs with (security_invoker = on) as
select i.id as menu_item_id, i.restaurant_id, i.name_fr as name, i.base_price,
       coalesce(sum(r.quantity * inv.unit_price_mad), 0) as computed_cost,
       i.base_price - coalesce(sum(r.quantity * inv.unit_price_mad), 0) as margin_mad,
       case when i.base_price > 0
         then round(((i.base_price - coalesce(sum(r.quantity * inv.unit_price_mad),0))
                     / i.base_price * 100)::numeric, 1) else null end as margin_pct
from public.items i
left join public.recipes r on r.menu_item_id = i.id
left join public.inventory_items inv on inv.id = r.inventory_item_id
group by i.id, i.restaurant_id, i.name_fr, i.base_price;

-- deduction: read line->>'item_id', clamp at 0, log variance (never throw)
--   update ... set stock = greatest(stock - (rq * qty), 0) ...
--   if (old stock - rq*qty) < 0 then insert into inventory_variances(... 'stock_went_negative' ...)
```
Rest of the plan's `0013` (indexes, `inventory_variances` table + RLS, the
auto-deduction trigger structure, `get_available_menu` RPC) is fine **once
the five fixes above are applied**. The `get_available_menu` RPC also needs
`inv.stock < r.quantity` (correct) and should stay `stable` — it's filtered
by the `rid` argument so it's tenant-safe by parameter.

**UI/API tasks (6.1.2–6.1.5) are accurate** with two nits:
- Auto-86 (6.1.4): `getPublicMenu` in `src/lib/menu.ts` currently does
  `.from("items")` inside an `unstable_cache` — swap to `.rpc("get_available_menu", {rid})`
  inside the same cache wrapper; `revalidateTag("menu","max")` is already the
  convention (two-arg form).
- 6.1.5 path typo: it's `/dashboard/inventory/variances`, not
  `/dashboard/inSubventory/variances`.

---

## 🟠 Phase 6.2 — Real KDS (`0014_kds.sql`)

Same order-line bug + a missing realtime step:
- ⚠ **`fan_order_to_kds` reads `line->>'id'`** → must be `line->>'item_id'`,
  and **`line->'modifiers'` doesn't exist** → the order line carries
  **`options`** (a `text[]` of chosen names), so store `line->'options'` (or
  drop the modifiers column until the POS emits structured modifiers).
- ⚠ **Realtime isn't enabled in this project at all.** For the tap-to-bump
  live propagation, `0014` must also
  `alter publication supabase_realtime add table public.kds_tickets;` (and
  `table_sessions`/`orders` for 6.3's pulse). Without it, the `.channel()`
  subscription in the plan receives nothing and the KDS silently falls back
  to stale data. This is a real, omitted migration step.
- The rest (`stations`, `items.station_id`, `kds_tickets` lifecycle, all-day
  view, the full-screen `/dashboard/kds`) is well-specified and fits.

🔴 **Hard dependency the plan misses — KDS is half-blind until `PosView` is fixed.**
The fan-out trigger fires on `orders` INSERT. Today the **only** thing that
inserts orders is the public `/api/orders` route (online + delivery). The
in-dashboard POS (`PosView`, mounted in `orders-view.tsx`) **creates no
order** — so **dine-in orders never reach the kitchen display.** In a
dine-in restaurant that's most of the volume. So the real 6.2 prerequisite
is: **build a staff order-creation endpoint + wire `PosView` to it** (this is
the same broken-POS issue flagged at the end of `ROADMAP.md`). Sequence that
*before or with* KDS, not after.

- 6.2.4 (cuisine lands on KDS): changing `defaultRouteFor('cuisine')` to
  `/dashboard/kds` and adding the `ROUTE_ACCESS` entry **will break the unit
  tests I just shipped** (`src/lib/permissions.test.ts` asserts cuisine →
  `/dashboard/orders`, and `e2e/rbac.spec.ts`'s matrix). Those must be
  updated in the same change — cheap, but don't forget or CI goes red.

---

## 🟡 Phase 6.3 — Management Depth (`0015_table_sessions.sql`)

- Menu-engineering matrix (6.3.1): correct, **depends on 6.1's
  `menu_item_costs`** for margin — real dependency, keep the order.
- Table turnover (6.3.2): SQL is clean (references `tables`/`orders`, both
  exist). Note the auto-vacate "when order is paid/marked done" — there's **no
  payment yet** (6.4), so wire vacate to `orders.status = 'done'` (the
  existing status flow) for now, or to "all KDS tickets bumped" once 6.2
  lands. Pick one explicitly.
- Live pulse (6.3.3): depends on the **same realtime-publication step** as
  6.2 — do it once in `0014` and reuse.

---

## 🟣 Phase 6.4 — Labor & Payment (`0016_labor.sql`)

- Labor migration/UI (6.4.1–6.4.3): schema is fine (`profiles.id = auth.uid()`,
  so the `profile_id = auth.uid()` RLS works). `set_updated_at()` reuse OK.
  Buildable and verifiable now.
- Payment (6.4.4): correctly flagged as **externally blocked** (CMI merchant
  onboarding). Two corrections:
  - The **order-payment seam is new** — don't overload the existing
    `BillingProvider` in `src/lib/billing/provider.ts` (that's SaaS
    subscription billing). Add a separate `PaymentProvider`
    (`initiatePayment(order)`, `verifyWebhook(payload)`).
  - `src/app/api/webhooks/billing/route.ts` is **already a deliberate 501
    stub** with a comment explaining the CMI/Stripe-Morocco situation — that's
    where the webhook handler slots in; don't create a parallel route.
  - `orders` has no `payment_status` column yet → add it in `0016`.

---

## What to work on — recommended order

Everything except payment is buildable and verifiable in this environment
today. Recommended sequence (by "unlocks the most / lowest risk first"):

1. **6.1 Recipe Costing** — the foundation (margins, menu engineering,
   auto-86). Self-contained, highest ROI, no external blockers. **Start here.**
2. **Fix `PosView` → real staff order creation** — small but load-bearing:
   it makes both auto-deduction (6.1) *and* KDS (6.2) actually cover dine-in,
   and closes the known broken-POS gap. Do it between 6.1 and 6.2.
3. **6.2 Real KDS** (incl. the realtime-publication migration + the
   permissions test updates).
4. **6.3 Management Depth** (needs 6.1's cost view + 6.2's realtime).
5. **6.4 Labor** now; **6.4 Payment** only once CMI onboarding is unblocked —
   kick off that paperwork in parallel, it's the long pole.

## Summary of what the generic plan got materially wrong
1. **Migration numbers collide** — `0012` is taken; recipes start at `0013`. (all sub-phases)
2. **`inventory_items.unit_cost` → `unit_price_mad`** — cost view errors as written. (6.1)
3. **`items.name` → `name_fr`** — cost view + trigger error. (6.1)
4. **Order line is `item_id`, not `id`** — every trigger silently no-ops. (6.1 + 6.2)
5. **`stock >= 0` CHECK** makes "soft negative deduction" abort the order — must clamp at 0. (6.1)
6. **`menu_item_costs` view leaks cross-tenant** without `security_invoker = on`. (6.1)
7. **Realtime never enabled** — KDS/pulse need a `supabase_realtime` publication migration the plan omits. (6.2, 6.3)
8. **KDS depends on fixing `PosView`** (dine-in orders don't exist yet) — undocumented prerequisite. (6.2)
9. **Changing cuisine's landing route breaks the shipped unit + e2e tests** — must update them together. (6.2)
10. **Order-payment ≠ the existing subscription `BillingProvider`** — it's a new seam; webhook route is already a 501 stub. (6.4)

*Everything else — the strategic framing, sequencing rationale, KDS UX,
menu-engineering matrix, labor model, CMI-blocked payment — is accurate for
this repo and preserved.*
