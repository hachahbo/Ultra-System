-- Darna v6 — Inventory: stock tracking, suppliers, deliveries.
-- Tenant tables following the same shape as categories/items (0001_init.sql):
-- restaurant_id + RLS, public read is NOT needed here (inventory is a
-- dashboard-only concern), so read access is tenant-scoped like orders.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.inventory_categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  sort_order    int not null default 0
);

create table public.inventory_items (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants (id) on delete cascade,
  category_id     uuid not null references public.inventory_categories (id) on delete cascade,
  name            text not null,
  unit            text not null,
  stock           numeric(10,2) not null default 0 check (stock >= 0),
  min_threshold   numeric(10,2) not null default 0 check (min_threshold >= 0),
  unit_price_mad  numeric(10,2) not null default 0 check (unit_price_mad >= 0),
  created_at      timestamptz not null default now()
);

create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  category      text not null,
  status        text not null default 'active' check (status in ('active', 'follow_up')),
  created_at    timestamptz not null default now()
);

create table public.deliveries (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  supplier_id   uuid references public.suppliers (id) on delete set null,
  label         text not null,
  eta_at        timestamptz not null,
  urgent        boolean not null default false,
  created_at    timestamptz not null default now()
);

create index inventory_categories_restaurant_idx on public.inventory_categories (restaurant_id, sort_order);
create index inventory_items_restaurant_idx on public.inventory_items (restaurant_id, category_id);
create index suppliers_restaurant_idx on public.suppliers (restaurant_id);
create index deliveries_restaurant_idx on public.deliveries (restaurant_id, eta_at);

-- ---------------------------------------------------------------------------
-- RLS — same tenant-read / owner-write shape as categories & items, minus
-- the public-read policy (inventory never appears on the public site).
-- ---------------------------------------------------------------------------

alter table public.inventory_categories enable row level security;
alter table public.inventory_items      enable row level security;
alter table public.suppliers            enable row level security;
alter table public.deliveries           enable row level security;

create policy "inventory_categories tenant read" on public.inventory_categories
  for select using (restaurant_id = public.my_restaurant_id());
create policy "inventory_categories owner write" on public.inventory_categories
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

create policy "inventory_items tenant read" on public.inventory_items
  for select using (restaurant_id = public.my_restaurant_id());
create policy "inventory_items owner write" on public.inventory_items
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

create policy "suppliers tenant read" on public.suppliers
  for select using (restaurant_id = public.my_restaurant_id());
create policy "suppliers owner write" on public.suppliers
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

create policy "deliveries tenant read" on public.deliveries
  for select using (restaurant_id = public.my_restaurant_id());
create policy "deliveries owner write" on public.deliveries
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- ---------------------------------------------------------------------------
-- Feature flag: add 'inventory' to the restaurant_features check constraint.
-- ---------------------------------------------------------------------------

alter table public.restaurant_features drop constraint restaurant_features_feature_key_check;
alter table public.restaurant_features add constraint restaurant_features_feature_key_check
  check (feature_key in (
    'online_ordering', 'reservations', 'analytics', 'staff_management',
    'menu_editor', 'floor_plan', 'promotions', 'inventory'
  ));
