-- Fix: the `public.tables` (floor plan) relation is missing from the PostgREST
-- schema cache. This recreates it if absent (idempotent) and forces a schema
-- reload so the API can see it. Run once in the Supabase SQL Editor.

create table if not exists public.tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  number        text not null,
  seats         int not null default 2 check (seats between 1 and 30),
  pos_x         real not null default 0.1 check (pos_x between 0 and 1),
  pos_y         real not null default 0.1 check (pos_y between 0 and 1),
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (restaurant_id, number)
);

create index if not exists tables_restaurant_idx on public.tables (restaurant_id);

alter table public.tables enable row level security;

drop policy if exists "tables tenant read" on public.tables;
create policy "tables tenant read" on public.tables
  for select using (restaurant_id = public.my_restaurant_id());

drop policy if exists "tables owner write" on public.tables;
create policy "tables owner write" on public.tables
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- Force PostgREST to reload its schema cache so the API sees the table.
notify pgrst, 'reload schema';
