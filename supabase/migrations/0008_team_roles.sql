-- Darna v8 — Team roles: split the 'staff' tier into manager/serveur/cuisine,
-- add a soft-disable flag, and extend write authority on content/ops tables
-- to managers. 'owner' (= Admin) is untouched — it stays the RLS write
-- authority everywhere except the tables listed below.

-- ---------------------------------------------------------------------------
-- profiles.role: widen the CHECK constraint, migrate existing staff rows.
-- ---------------------------------------------------------------------------

update public.profiles set role = 'serveur' where role = 'staff';

do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%role%';

  if con_name is not null then
    execute format('alter table public.profiles drop constraint %I', con_name);
  end if;
end $$;

alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'manager', 'serveur', 'cuisine'));

alter table public.profiles add column active boolean not null default true;

-- ---------------------------------------------------------------------------
-- Manager write authority: content (menu editor) + floor plan + inventory
-- are the resources a manager may edit per the access matrix. Everything
-- else (restaurants, restaurant_theme, subscriptions, restaurant_features,
-- promotions, customers, profiles writes, menu-images storage) stays
-- owner-only and is untouched here.
-- ---------------------------------------------------------------------------

create or replace function public.my_role_can_manage()
returns boolean
language sql stable security definer set search_path = public as
$$ select public.my_role() in ('owner', 'manager') $$;

drop policy "categories owner write" on public.categories;
create policy "categories owner write" on public.categories
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

drop policy "items owner write" on public.items;
create policy "items owner write" on public.items
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

drop policy "tables owner write" on public.tables;
create policy "tables owner write" on public.tables
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

drop policy "inventory_categories owner write" on public.inventory_categories;
create policy "inventory_categories owner write" on public.inventory_categories
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

drop policy "inventory_items owner write" on public.inventory_items;
create policy "inventory_items owner write" on public.inventory_items
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

drop policy "suppliers owner write" on public.suppliers;
create policy "suppliers owner write" on public.suppliers
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

drop policy "deliveries owner write" on public.deliveries;
create policy "deliveries owner write" on public.deliveries
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

-- customers: read-only resource, but manager has read access per the access
-- matrix (only owner/manager see /dashboard/customers) — widen the existing
-- read-only policy the same way. Still no write policy for any role.
drop policy "customers owner read" on public.customers;
create policy "customers owner read" on public.customers
  for select using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

notify pgrst, 'reload schema';
