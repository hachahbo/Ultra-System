-- Darna v29 — Promo codes: percentage/fixed discount codes customers can
-- redeem at checkout (or ahead of time on the public "Gifts" code page).
-- Owner-managed, restaurant-scoped, same shape as restaurant_features
-- (0002_admin_dashboard.sql): RLS has an owner-only policy and NO public
-- read policy at all — codes must never be listable via the anon key, or
-- anyone could browse a restaurant's entire code list. Redemption always
-- goes through /api/promo-codes/validate on the service role, which looks
-- up one exact code at a time.

create table public.promo_codes (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants (id) on delete cascade,
  code              text not null,
  discount_type     text not null check (discount_type in ('percentage', 'fixed')),
  discount_value    numeric(10,2) not null check (discount_value > 0),
  min_order_amount  numeric(10,2) not null default 0 check (min_order_amount >= 0),
  max_uses          int check (max_uses is null or max_uses > 0),
  uses_count        int not null default 0,
  active            boolean not null default true,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  constraint promo_codes_percentage_max
    check (discount_type <> 'percentage' or discount_value <= 100),
  unique (restaurant_id, code)
);

create index promo_codes_restaurant_idx on public.promo_codes (restaurant_id, code);

alter table public.promo_codes enable row level security;

create policy "promo_codes owner all" on public.promo_codes
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- Orders carry a snapshot of the code applied + the amount it knocked off —
-- denormalized like customer_phone (0028): a code can be edited or deleted
-- later, but the order's own record of what the customer actually paid must
-- never silently change. promo_code_id is kept too (nullable, set null on
-- delete) purely so the dashboard can still look up the live code's config;
-- `promo_code` (text) and `discount_amount` are the source of truth.
alter table public.orders
  add column if not exists promo_code_id uuid references public.promo_codes (id) on delete set null,
  add column if not exists promo_code text,
  add column if not exists discount_amount numeric(10,2) not null default 0;

notify pgrst, 'reload schema';
