-- Darna v2 — owner admin dashboard: floor plan, order status flow,
-- reservation table assignment, staff lifecycle fields.

-- ---------------------------------------------------------------------------
-- Tables (floor plan)
-- ---------------------------------------------------------------------------

create table public.tables (
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

create index tables_restaurant_idx on public.tables (restaurant_id);

alter table public.tables enable row level security;

-- Tenant read (no role check — staff use the live order map too).
create policy "tables tenant read" on public.tables
  for select using (restaurant_id = public.my_restaurant_id());

-- Owner-only writes.
create policy "tables owner write" on public.tables
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- ---------------------------------------------------------------------------
-- Orders: preparing status + optimistic-concurrency column
-- ---------------------------------------------------------------------------

alter table public.orders add column updated_at timestamptz not null default now();

do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.orders'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';

  if con_name is not null then
    execute format('alter table public.orders drop constraint %I', con_name);
  end if;
end $$;

alter table public.orders add constraint orders_status_check
  check (status in ('new', 'preparing', 'done'));

-- ---------------------------------------------------------------------------
-- Reservations: table assignment
-- ---------------------------------------------------------------------------

alter table public.reservations add column assigned_table_number text;

-- ---------------------------------------------------------------------------
-- Profiles: owner can list their restaurant's staff; staff lifecycle fields
-- ---------------------------------------------------------------------------

alter table public.profiles add column must_change_password boolean not null default false;
alter table public.profiles add column consented_at timestamptz;

-- my_restaurant_id()/my_role() are SECURITY DEFINER, so this does not recurse.
create policy "profiles owner read tenant" on public.profiles
  for select using (
    restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner'
  );
