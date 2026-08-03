-- Darna v26 — Order payment state (Phase 8.1). `orders` had no concept of
-- payment at all — not even cash — only a fulfilment `status` ('new' |
-- 'preparing' | 'done'). This adds a strictly orthogonal payment_status:
-- a cash order is commonly 'done' + 'paid'; a disputed one is 'done' +
-- 'unpaid'. Never collapse the two. Online payment (CMI) stays out of scope
-- here — externally blocked on Moroccan merchant onboarding, see
-- src/lib/payments/provider.ts for the seam this leaves behind.

alter table public.orders
  add column if not exists payment_method text not null default 'cash'
    check (payment_method in ('cash', 'card_on_delivery', 'online')),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by uuid references public.profiles (id) on delete set null;

-- paid_status = 'paid' must always carry a timestamp — the reconciliation
-- view sorts/filters on paid_at and a null there would silently drop the row.
alter table public.orders
  add constraint orders_paid_at_required
    check (payment_status <> 'paid' or paid_at is not null);

-- Backfill: every historical order was fulfilled under the old cash-only,
-- no-payment-tracking flow. Without this every past order reads as unpaid
-- and the new collected/outstanding split is nonsense on day one.
update public.orders
set payment_status = 'paid', paid_at = created_at
where status = 'done' and payment_status = 'unpaid';

create index orders_restaurant_payment_idx
  on public.orders (restaurant_id, payment_status, created_at desc);
