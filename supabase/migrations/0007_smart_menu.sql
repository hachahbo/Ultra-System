-- Darna v7 — Smart Menu: eligibility flag on items + a promotions table for
-- pick-N-from-category combos (starting with "Menu Smart": 1 Entrée + 1 Plat
-- Principal for a fixed price). Tenant table following the same
-- restaurant_id + RLS shape as categories/items (0001_init.sql).

alter table public.items add column is_smart_menu_eligible boolean not null default false;

create table public.promotions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  description   text,
  price         numeric(10,2) not null check (price >= 0),
  active        boolean not null default true,
  sort_order    int not null default 0,
  -- Pick logic, same jsonb-config style as items.customization_groups, e.g.
  -- [{"category_id": "<uuid>", "count": 1}, {"category_id": "<uuid>", "count": 1}]
  -- The app resolves each entry to that category's items where
  -- is_smart_menu_eligible = true.
  rules         jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index promotions_restaurant_idx on public.promotions (restaurant_id, sort_order);

alter table public.promotions enable row level security;

create policy "promotions public read" on public.promotions
  for select using (true);
create policy "promotions owner write" on public.promotions
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');
