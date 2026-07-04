-- Darna v1 schema — multi-tenant restaurant ordering (plan.md §8)
-- Every tenant table carries restaurant_id and is protected by RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.restaurants (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name                text not null,
  logo_url            text,
  whatsapp_number     text,
  phone               text,
  address             text,
  hours               text,
  currency            text not null default 'MAD',
  base_delivery_fee   numeric(10,2) not null default 0,
  is_dine_in_enabled  boolean not null default true,
  is_delivery_enabled boolean not null default true,
  about_text          text,
  created_at          timestamptz not null default now()
);

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  role          text not null default 'owner' check (role in ('owner', 'staff')),
  created_at    timestamptz not null default now()
);

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name_fr       text not null,
  name_ar       text,
  name_es       text,
  sort_order    int not null default 0
);

create table public.items (
  id                   uuid primary key default gen_random_uuid(),
  restaurant_id        uuid not null references public.restaurants (id) on delete cascade,
  category_id          uuid not null references public.categories (id) on delete cascade,
  name_fr              text not null,
  name_ar              text,
  name_es              text,
  description_fr       text,
  base_price           numeric(10,2) not null check (base_price >= 0),
  image_url            text,
  in_stock             boolean not null default true,
  sort_order           int not null default 0,
  customization_groups jsonb not null default '[]'::jsonb
);

create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  phone         text not null,
  first_seen    timestamptz not null default now(),
  order_count   int not null default 0,
  last_order    timestamptz,
  unique (restaurant_id, phone)
);

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  type          text not null check (type in ('dine_in', 'delivery')),
  table_number  text,
  customer_id   uuid references public.customers (id) on delete set null,
  customer_name text,
  address       text,
  note          text,
  items         jsonb not null,
  subtotal      numeric(10,2) not null default 0,
  delivery_fee  numeric(10,2) not null default 0,
  total         numeric(10,2) not null default 0,
  status        text not null default 'new' check (status in ('new', 'done')),
  created_at    timestamptz not null default now()
);

create table public.reservations (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  customer_name  text not null,
  customer_phone text not null,
  date           date not null,
  time           time not null,
  party_size     int not null check (party_size between 1 and 50),
  note           text,
  status         text not null default 'new' check (status in ('new', 'confirmed', 'declined')),
  created_at     timestamptz not null default now()
);

create index orders_restaurant_created_idx on public.orders (restaurant_id, created_at desc);
create index reservations_restaurant_date_idx on public.reservations (restaurant_id, date, time);
create index items_restaurant_idx on public.items (restaurant_id, category_id, sort_order);
create index customers_restaurant_idx on public.customers (restaurant_id, last_order desc);

-- ---------------------------------------------------------------------------
-- Tenant helpers (security definer so RLS on profiles doesn't recurse)
-- ---------------------------------------------------------------------------

create or replace function public.my_restaurant_id()
returns uuid
language sql stable security definer set search_path = public as
$$ select restaurant_id from public.profiles where id = auth.uid() $$;

create or replace function public.my_role()
returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

-- ---------------------------------------------------------------------------
-- RLS — tenant isolation is a hard requirement (plan.md §0, §8)
-- Public site reads menu data with the anon key; everything else requires a
-- session bound to the row's restaurant_id. All public writes go through
-- server code using the service role (which bypasses RLS by design).
-- ---------------------------------------------------------------------------

alter table public.restaurants  enable row level security;
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.items        enable row level security;
alter table public.customers    enable row level security;
alter table public.orders       enable row level security;
alter table public.reservations enable row level security;

-- restaurants: public read (branding/hours are public); owner may update own row
create policy "restaurants public read" on public.restaurants
  for select using (true);
create policy "restaurants owner update" on public.restaurants
  for update using (id = public.my_restaurant_id() and public.my_role() = 'owner');

-- profiles: user can read own profile
create policy "profiles self read" on public.profiles
  for select using (id = auth.uid());

-- categories & items: public read (the menu), owner-only writes
create policy "categories public read" on public.categories
  for select using (true);
create policy "categories owner write" on public.categories
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

create policy "items public read" on public.items
  for select using (true);
create policy "items owner write" on public.items
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- customers: owner-only read (the exportable asset); no client writes
create policy "customers owner read" on public.customers
  for select using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- orders: owner + staff read and status updates within own restaurant
create policy "orders tenant read" on public.orders
  for select using (restaurant_id = public.my_restaurant_id());
create policy "orders tenant update" on public.orders
  for update using (restaurant_id = public.my_restaurant_id())
  with check (restaurant_id = public.my_restaurant_id());

-- reservations: owner + staff read and status updates within own restaurant
create policy "reservations tenant read" on public.reservations
  for select using (restaurant_id = public.my_restaurant_id());
create policy "reservations tenant update" on public.reservations
  for update using (restaurant_id = public.my_restaurant_id())
  with check (restaurant_id = public.my_restaurant_id());

-- ---------------------------------------------------------------------------
-- Storage: menu images. Public read; authenticated writes scoped to a folder
-- named after the uploader's restaurant_id.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

create policy "menu images public read" on storage.objects
  for select using (bucket_id = 'menu-images');
create policy "menu images tenant insert" on storage.objects
  for insert with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = public.my_restaurant_id()::text
    and public.my_role() = 'owner'
  );
create policy "menu images tenant delete" on storage.objects
  for delete using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = public.my_restaurant_id()::text
    and public.my_role() = 'owner'
  );
