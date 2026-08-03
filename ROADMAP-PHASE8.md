# Phase 8 — Revenue & Retention (The Sales Hooks)

> **Status: planned.** Nothing in this document has shipped.
> Baseline: `main` @ `b340e21`, migrations `0001`–`0025`, Next `16.2.10`, React `19.2.4`, next-intl `4.13.4`, zod `4.4.3`.
>
> **Why this phase exists:** `BRIEF-GAP-ANALYSIS.md` established that the platform delivers the brief's *operations* promises (Invisible Waiter, multi-tenancy, CSV export, digital menu) but ships **none** of its four *sales hooks* — Cash Flow, WhatsApp Marketing, Loyalty, Catering — plus no customer payment state at all. Phase 8 closes exactly that gap and nothing else. No new operations surface is added here.

## 0. Decisions on record

Settled before planning; do not relitigate mid-build.

| # | Decision | Chosen | Consequence |
| --- | --- | --- | --- |
| D1 | WhatsApp sender identity | **One platform number** (single Ultra-System WABA) | Tenants go live same-day. **Reputation is shared** — see §8 R1, the largest risk in this phase. |
| D2 | WhatsApp provider | **Meta Cloud API direct** | No middleman markup; we own template approval, webhook signature verification, retry/backoff. |
| D3 | Dine-in customer identity | **Optional phone at dine-in checkout** | Loyalty covers in-house regulars; skipping the field must never block an order. |
| D4 | Translation split | **Migrate to `i18n` jsonb, then drop `name_ar`/`name_es`** | One mechanism; adding a locale becomes data, not DDL. |

**Migration numbers below are indicative.** Three prior roadmap docs record a real numbering collision — run `ls supabase/migrations/` and take the next free number at write time rather than trusting `0026` here.

## 1. Sequence & critical path

```
Day 1  ── Submit Meta templates for approval ─────────────┐  (external wait: days)
          (§3.1 — do this FIRST, it blocks 8.2 and 8.3)   │
                                                          │
8.1 COD payment ──────────────────────────────────────────┤  (no external dependency)
          │                                               │
          ▼                                               ▼
8.2 WhatsApp transactional ◀──── needs approved templates ┘
          │
          ├──────────────▶ 8.3 Broadcast      (needs provider + opt-out from 8.2)
          │
          └──────────────▶ 8.4 Loyalty        (counter ships without 8.2; reward *notification* needs it)

8.5 i18n consolidation ─── independent, parallelisable
8.6 Catering pre-order ─── independent; richer if 8.1 has landed (deposits)
```

**The one scheduling rule that matters:** Meta template approval is a multi-day external wait and it gates two of the five workstreams. Submit templates on day one, then build 8.1 while waiting. Do not sequence 8.2 first and idle.

| Sub-phase | Scope | Est. | External blocker |
| --- | --- | --- | --- |
| 8.1 | Order payment state + COD + reconciliation | M | none |
| 8.2 | WhatsApp transactional (confirmation + receipts) | M | Meta template approval |
| 8.3 | Broadcast engine + marketing dashboard | L | inherits 8.2 |
| 8.4 | Loyalty (stamp card) | M | none (notification needs 8.2) |
| 8.5 | i18n consolidation → fr/en/es/ar + RTL | L | none |
| 8.6 | Catering / bulk pre-order | M | none |

## 2. Phase 8.1 — Order payment state + Cash on Delivery

**The pitch this unlocks:** *"Glovo holds your money 15–30 days. With this, tonight's cash is in your till tonight."*

**Current state:** `orders` has **no payment concept at all** — not even cash. Verified: zero hits for `payment_status` / `payment_method` across all 25 migrations. `orders.status` is only `'new' | 'done'` (`0001_init.sql:82`), which tracks *fulfilment*, not money. `src/lib/billing/provider.ts` is a `501` stub for **SaaS subscription** billing (restaurant → us) and is a different concern — do not extend it for customer payments.

### 2.1 Migration `0026_order_payments.sql`

```sql
alter table public.orders
  add column if not exists payment_method text not null default 'cash'
    check (payment_method in ('cash', 'card_on_delivery', 'online')),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by uuid references auth.users (id) on delete set null;
```

- **Backfill:** historical rows with `status = 'done'` → `payment_status = 'paid'`, `paid_at = created_at`. Without this, every past order reads as unpaid and the new revenue split is nonsense on day one.
- **Invariant:** `payment_status = 'paid'` ⇒ `paid_at is not null`. Enforce with a check constraint.
- **Index:** `orders (restaurant_id, payment_status, created_at desc)` — the reconciliation view's primary query.
- Keep `payment_status` strictly orthogonal to `status`. A cash order is commonly `done` + `paid`; a disputed one is `done` + `unpaid`. Never collapse them.

### 2.2 API

- `src/lib/schemas.ts` — `orderSchema` gains `payment_method`, **server-restricted to `'cash'` in this phase**. Reject `'online'` with 400 until CMI ships; never trust the client here.
- `src/app/api/orders/route.ts` — persist `payment_method`; new orders insert `payment_status: 'unpaid'`.
- **New** `PATCH /api/dashboard/orders/[id]/payment` — marks paid, stamps `paid_at` + `paid_by`. Guard with `canWrite(role, 'orders')`; `serveur` and `cuisine` must not settle payments — restrict to `owner` + `manager`.

### 2.3 UI

| Surface | Change |
| --- | --- |
| `orders-view.tsx` | Payment badge per row + "Marquer payé" action |
| `pos-view.tsx` | Settle-at-counter control; cash orders normally close paid immediately |
| **New** `/dashboard/orders/reconciliation` | Daily cash total, unpaid list, per-staff `paid_by` breakdown. Add to `ROUTE_ACCESS` as `owner` + `manager` only (`src/lib/permissions.ts:22`) |
| `analytics-view.tsx` | Split collected vs outstanding — currently sums `orders.total` blind to payment |

⚠️ **`analytics-math.ts` and `overview-view.tsx` both sum `orders.total` directly.** The existing `/api/orders` code comments already warn that a bug there "would hide real revenue for weeks." Decide explicitly whether headline revenue means *ordered* or *collected*, apply it in both places, and cover it in `analytics-math.test.ts`.

### 2.4 CMI seam (build, don't implement)

`src/lib/payments/provider.ts` — mirror the existing `billing/provider.ts` stub shape:

```ts
export interface PaymentProvider {
  createCheckout(order: OrderRef): Promise<{ redirectUrl: string }>;
  verifyWebhook(req: Request): Promise<PaymentEvent | null>;
}
```

Ship a `501` stub. This keeps CMI a config swap when Moroccan merchant onboarding clears, with zero call-site churn.

## 3. Phase 8.2 — WhatsApp transactional

**The pitch this unlocks:** confirmations land where Moroccan customers actually read — and it is the prerequisite for 8.3 and 8.4's reward moment.

**Current state:** `restaurants.whatsapp_number` is a **display-only contact string** (`0001_init.sql:15`) rendered as `wa.me` links. No outbound messaging code exists anywhere.

### 3.1 Do this first — Meta setup (external, multi-day)

1. Meta Business verification for the Ultra-System WABA (D1: one platform number).
2. Submit **utility** templates for approval. Localise each in `fr` + `en` now, `ar` + `es` after 8.5:
   - `order_confirmation` — restaurant name, order ref, total, type (delivery/dine-in)
   - `order_ready` *(optional, second pass of this sub-phase)*
   - `loyalty_reward_earned` — used by 8.4
3. Marketing templates for 8.3 are a **separate approval track** — submit them at the same time, they are slower.

> Template bodies must carry the restaurant's name in a variable, because every message ships from the shared platform number. A customer who reads only "your order is confirmed" with no restaurant name will report it as spam — which under D1 damages *every* tenant.

### 3.2 Migration `0027_whatsapp.sql`

```sql
create table public.whatsapp_messages (
  id                  uuid primary key default gen_random_uuid(),
  restaurant_id       uuid not null references public.restaurants (id) on delete cascade,
  customer_id         uuid references public.customers (id) on delete set null,
  to_phone            text not null,
  kind                text not null check (kind in ('transactional', 'marketing')),
  template_name       text,
  payload             jsonb not null default '{}'::jsonb,
  status              text not null default 'queued'
                        check (status in ('queued','sent','delivered','read','failed')),
  provider_message_id text,
  error               text,
  broadcast_id        uuid,            -- FK added in 0028
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.customers
  add column if not exists whatsapp_opt_in boolean not null default true,
  add column if not exists opted_out_at timestamptz;
```

- RLS: tenant read via `restaurant_id = public.my_restaurant_id()`, `owner`/`manager` only. Writes happen through the service role. Follow the `0021_events.sql:68-90` policy style exactly.
- Index `whatsapp_messages (restaurant_id, created_at desc)` and `(provider_message_id)` — the receipts webhook looks up by the latter on every callback.
- **Opt-out is not optional.** `whatsapp_opt_in` gates all `kind = 'marketing'` sends. A transactional confirmation for an order the customer just placed is legitimate; a blast to an opted-out number is not.

### 3.3 Provider module

```
src/lib/whatsapp/
  provider.ts     # interface — sendTemplate / sendText / verifyWebhook
  meta-cloud.ts   # Meta Cloud API v21.0 implementation (D2)
  templates.ts    # typed template names + variable shapes
  send.ts         # persist-then-send, retry/backoff, opt-out enforcement
```

Env (add to `.env.example`, never commit real values — `secret-scan.yml` and the husky pre-commit hook will catch it):
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WABA_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`.

### 3.4 Wiring the send — must not block the order

`src/app/api/orders/route.ts` currently returns `201` immediately after insert. **Do not `await` the WhatsApp call in the request path** — a slow Meta response would delay the customer's confirmation screen, and a Meta outage would fail otherwise-valid orders.

Use `after()` from `next/server` (stable since 15.1; verified available in the installed 16.2.10 docs at `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`):

```ts
import { after } from "next/server";

// ...after the order insert succeeds, before returning 201
after(async () => {
  await sendOrderConfirmation({ orderId: order.id, restaurantId: restaurant.id });
});

return NextResponse.json({ id: order.id, total }, { status: 201 });
```

The row is written `queued` first, then patched to `sent`/`failed`, so a crashed callback leaves an auditable record rather than a silent drop. Note `after` runs even if the response errored — make the callback re-entrant and guard on order existence.

### 3.5 Receipts webhook

`src/app/api/webhooks/whatsapp/route.ts`:
- `GET` — Meta's `hub.challenge` verification handshake.
- `POST` — **verify `X-Hub-Signature-256` against `WHATSAPP_APP_SECRET` before parsing.** An unauthenticated webhook that writes to `whatsapp_messages` is a free defacement vector.
- Map delivery/read receipts onto `status` by `provider_message_id`.
- Handle inbound `STOP` / `ARRÊT` → set `opted_out_at`, `whatsapp_opt_in = false`.

## 4. Phase 8.3 — Broadcast engine

**The pitch this unlocks:** *"Slow Tuesday? One click, 15% off to everyone who ordered last month."* Per the gap analysis this is **the demo that closes owners** — but it is also where a shared sender number bites hardest (§8 R1).

### 4.1 Migration `0028_broadcasts.sql`

```sql
create table public.broadcasts (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  created_by     uuid references auth.users (id) on delete set null,
  template_name  text not null,
  segment        text not null
                   check (segment in ('all','recent_30d','lapsed_60d','top_spenders')),
  variables      jsonb not null default '{}'::jsonb,
  status         text not null default 'draft'
                   check (status in ('draft','queued','sending','sent','failed','cancelled')),
  recipient_count int not null default 0,
  sent_count      int not null default 0,
  failed_count    int not null default 0,
  scheduled_for  timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.whatsapp_messages
  add constraint whatsapp_messages_broadcast_fk
  foreign key (broadcast_id) references public.broadcasts (id) on delete set null;
```

### 4.2 Throttling & guardrails — non-negotiable under D1

Because every tenant shares one WABA, one careless blast degrades deliverability for all of them:

1. **Per-tenant daily cap** by plan (e.g. free 0 / pro 200 / enterprise 1000 msgs·day). Reuse `checkRateLimit()` from `src/lib/rate-limit.ts` keyed `broadcast:{restaurant_id}`.
2. **Global send queue** with paced dispatch respecting Meta's per-second limits. Never fan out a whole segment in one burst.
3. **Opt-out enforced at send time**, re-checked per recipient — not just at segment build.
4. **Approved templates only.** No free-text marketing; Meta rejects it outside the 24h window.
5. **Cooldown** — max one marketing broadcast per tenant per 24h.
6. **First broadcast requires Super Admin approval** (`platform_admins` already exists) — a cheap circuit-breaker while quality score is unproven.

### 4.3 Surfaces

- **New** `/dashboard/marketing` — segment picker with live recipient count, template preview, test-send-to-self, confirm dialog showing the exact recipient count. Add to `ROUTE_ACCESS`, `owner` only.
- New feature key `marketing` in `FEATURE_KEYS` (`src/lib/types.ts:142`) + `PLAN_DEFAULTS` for all three plans (`src/lib/features.ts:12`). Suggest pro + enterprise.
- **Super Admin:** per-tenant message volume, spend, and failure rate. Under D1 *you* pay Meta, so an unmetered tenant is a direct margin leak — this view is cost control, not analytics.

## 5. Phase 8.4 — Loyalty (digital stamp card)

**The pitch this unlocks:** *"5th order → automatic WhatsApp: free dessert. No paper cards, and you learn who your regulars are."*

**Current state:** zero loyalty code. But `customers.order_count` and `last_order` already exist and are maintained (`0001_init.sql:63-65`) — the counter is half-built already.

### 5.1 Two prerequisite fixes in `/api/orders`

Both are in the existing customer-upsert block and must land before any reward logic:

1. **The increment is a race.** It reads `order_count`, then writes `order_count + 1` in a separate statement. Two concurrent orders lose a count — and a loyalty threshold that silently skips is worse than no loyalty. Replace with an atomic RPC:
   ```sql
   create or replace function public.record_customer_order(
     p_restaurant_id uuid, p_phone text, p_name text
   ) returns table (customer_id uuid, new_count int) ...
   -- single INSERT ... ON CONFLICT DO UPDATE SET order_count = customers.order_count + 1
   ```
2. **Dine-in customers are invisible.** The upsert is gated on `input.type === 'delivery'`. Per **D3**, widen it to *any order carrying a phone*, and add an **optional** phone field to dine-in checkout in `checkout-client.tsx`, framed as the loyalty opt-in. Skipping it must still produce a valid order — the sub-60-second Invisible Waiter flow is the product's signature demo and cannot regress.

### 5.2 Migration `0029_loyalty.sql`

```sql
create table public.loyalty_programs (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  active        boolean not null default false,
  threshold     int not null default 5 check (threshold between 2 and 50),
  reward_label  text not null,
  created_at    timestamptz not null default now()
);

create table public.loyalty_rewards (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  customer_id   uuid not null references public.customers (id) on delete cascade,
  code          text not null,
  earned_at     timestamptz not null default now(),
  redeemed_at   timestamptz,
  redeemed_by   uuid references auth.users (id) on delete set null,
  unique (restaurant_id, code)
);
```

- Issue the reward inside the same RPC as the increment: when `new_count % threshold = 0` and the program is active, insert a reward. Same transaction — a reward that can be earned twice is a real cash leak.
- Notify via 8.2's `loyalty_reward_earned` template inside the same `after()` callback as the confirmation.
- **Redemption in `pos-view.tsx`**: staff looks up by phone or code, marks redeemed. Server-side guard on double-redemption (`redeemed_at is null` in the `WHERE`, check affected rows) — never trust a disabled button.
- New feature key `loyalty`; suggest enterprise, or pro as an upsell lever.

## 6. Phase 8.5 — i18n consolidation (D4)

**Current state:** two competing mechanisms. `0001_init.sql:37-49` created `categories.name_ar/name_es` and `items.name_ar/name_es` — still wired end-to-end through `src/lib/schemas.ts:187`, the category/item API routes, and `item-form.tsx:57` — so owners can **type Arabic today and see nothing render**. `0023_content_i18n.sql` introduced the `i18n` jsonb resolver (`en` only), and its own header comment flags the conflict.

Three migrations, deliberately separated so the destructive one lands only after verification:

| Migration | Action |
| --- | --- |
| `0030_i18n_backfill.sql` | Copy non-null `name_ar`/`name_es` into `i18n` as `{"ar":{"name":…},"es":{"name":…}}`. Non-destructive; idempotent. |
| `0031_locales_widen.sql` | Seed data / verification for `es` + `ar`. |
| `0032_drop_legacy_name_cols.sql` | **Only after** a query confirms zero rows where a legacy column is non-null and the jsonb key is absent. |

Code changes:
- `src/i18n/config.ts:4` → `locales = ["fr","en","es","ar"]`
- `src/lib/i18n-content.ts` — widen the resolver's locale union; fallback chain stays → `fr`
- Remove `name_ar`/`name_es` from `types.ts:231`, `schemas.ts:187`, the item/category routes, `item-form.tsx`
- `messages/es.json` + `messages/ar.json` — **893 keys each**; the existing parity test (`messages` suite) will fail loudly until complete, which is the desired guard
- **RTL for Arabic** — `dir` on `<html>` in `src/app/layout.tsx`, Tailwind logical properties (`ps-*`/`pe-*` over `pl-*`/`pr-*`) across the public site. Budget real time here; it is a visual audit, not a find-and-replace.
- **`Accept-Language` detection** in `src/i18n/request.ts` — currently cookie-only, zero hits for `Accept-Language` repo-wide. First visit should honour the browser, cookie overrides thereafter. This is the actual "Tangier Tourist" promise; without it the pitch overstates the product.

> Scope honesty: 8.5 is the largest item in this phase (~1,800 new translation keys + an RTL pass) and unlocks no revenue directly. If schedule pressure hits, ship `0030` + the resolver widening (which kills the "type Arabic, see nothing" bug) and defer the `es`/`ar` UI catalogues.

## 7. Phase 8.6 — Catering / bulk pre-order

**The pitch this unlocks:** *"Big office lunches Glovo handles terribly — and you keep 100% of a 2,000 DH ticket."*

**Current state:** zero hits for `catering|preorder|minimum_order` repo-wide. Orders are immediate-only. The nearest surface is `event_inquiries` (`0021_events.sql:43`) — which already carries `event_type = 'corporate'`, `guest_count`, `budget_estimated_mad`, `preferred_date`. **That is a lead form, not an order.** Build catering as a real order mode; optionally cross-link an inquiry to the resulting order.

### Migration `0033_catering.sql`

```sql
alter table public.orders
  drop constraint orders_type_check,
  add constraint orders_type_check
    check (type in ('dine_in', 'delivery', 'catering'));

alter table public.orders
  add column if not exists scheduled_for timestamptz;

alter table public.restaurants
  add column if not exists is_catering_enabled boolean not null default false,
  add column if not exists catering_min_order_mad numeric(10,2) not null default 500,
  add column if not exists catering_lead_hours int not null default 24;
```

⚠️ `orders.type` is referenced by the table-session trigger (`0015_table_sessions.sql:43` keys on `type = 'dine_in'`) and by KDS/analytics queries. Grep every `type =` usage before widening the constraint, and confirm a `catering` order does not accidentally open a table session.

- **Server-side enforcement** in `/api/orders` (never client-only): reject below `catering_min_order_mad`; reject `scheduled_for` sooner than `now() + catering_lead_hours`; both with locale-aware `Errors` namespace messages, matching the existing `getTranslations("Errors")` pattern.
- **Checkout:** mode toggle + date/time picker + live "minimum 500 DH — you're 120 DH short" feedback.
- **Dashboard:** upcoming catering orders sorted by `scheduled_for`, ideally on the overview so a 2,000 DH lunch is never missed. KDS should surface a catering ticket ahead of its slot, not on creation.
- New feature key `catering`; suggest pro + enterprise.
- With 8.1 landed, support a deposit (`payment_status = 'unpaid'` + partial) rather than full prepayment.

## 8. Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| **R1** | **Shared WABA reputation (D1).** One tenant's spammy blast tanks quality score → degraded delivery or a ban for *every* tenant simultaneously. Single highest-impact risk in Phase 8. | 🔴 High | Every guardrail in §4.2, no exceptions. Monitor quality score in Super Admin. Design the `whatsapp_accounts` per-tenant escape hatch early so a high-volume tenant can move to their own WABA without a rewrite. |
| R2 | Meta template rejection or slow approval blocks 8.2 + 8.3 | 🟠 Med | Submit day 1 (§3.1); build 8.1 during the wait; keep template bodies plain and utility-shaped. |
| R3 | Messaging cost is ours under D1 — an unmetered tenant leaks margin | 🟠 Med | Per-plan daily caps; Super Admin spend view; revisit pricing once real volume is known. |
| R4 | Revenue metrics shift meaning when `payment_status` lands | 🟠 Med | Decide ordered-vs-collected explicitly; update `analytics-math.ts` + `overview-view.tsx` together; extend `analytics-math.test.ts`. |
| R5 | Optional dine-in phone (D3) adds friction to the signature demo | 🟡 Low | Truly optional, one tap to skip, framed as a benefit. Measure capture rate before defending it. |
| R6 | Widening `orders.type` breaks table-session/KDS/analytics assumptions | 🟡 Low | Grep all `type =` call sites before the constraint change (§7). |
| R7 | Dropping `name_ar`/`name_es` loses owner-entered data | 🟡 Low | Three-step migration; `0032` only after a zero-row verification query. |

## 9. Definition of done

- [ ] A cash order can be placed, settled, and reconciled; daily cash total matches the till
- [ ] Placing an order delivers a WhatsApp confirmation naming the restaurant, without delaying the `201`
- [ ] `STOP` opts a customer out, and a subsequent broadcast provably skips them
- [ ] An owner sends a segmented broadcast; per-tenant cap and cooldown both enforced
- [ ] A 5th order issues exactly one reward (verified under concurrent inserts) and notifies by WhatsApp
- [ ] A reward redeems exactly once; a second attempt is rejected server-side
- [ ] Dine-in phone is optional — orders still succeed when skipped
- [ ] Owner-entered Arabic renders on the public site; `Accept-Language` picks the first-visit locale; Arabic renders RTL
- [ ] A 2,000 DH catering order 48h out is accepted; a 300 DH one and a 2h-out one are both rejected server-side
- [ ] `messages/*.json` parity test green; new `ROUTE_ACCESS` entries covered by `e2e/rbac.spec.ts`
- [ ] Tenant-isolation script re-run against every new table (`whatsapp_messages`, `broadcasts`, `loyalty_*`)

## 10. Deliberately out of scope

| Item | Why |
| --- | --- |
| CMI / online card payment | Blocked on Moroccan merchant onboarding. Seam built (§2.4), implementation deferred. |
| WhatsApp AI ordering bot (Darija) | Brief's Deal-Closer #3. Depends on 8.2 shipping and proving stable first. |
| Courier dispatch / last-mile API | `delivery_fee` is charged but no logistics exist. Separate phase. |
| Native iOS/Android via Expo | Brief's Phase 2, gated on a loyal user base. |
| Per-tenant WABA onboarding | The D1 escape hatch. Schema-anticipated (R1), not built. |
