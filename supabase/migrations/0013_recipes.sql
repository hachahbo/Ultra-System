-- Darna v13 — Recipe costing: links menu items to inventory ingredients,
-- computes food cost / margin, auto-deducts stock on order, logs variances.
--
-- Corrections applied from ROADMAP-PHASE6.md:
--   • column is unit_price_mad, not unit_cost                     (⚠ FIX 1)
--   • menu item name column is name_fr, not name                   (⚠ FIX 2)
--   • order line key is item_id, not id                            (⚠ FIX 3)
--   • stock CHECK (>= 0) → clamp with greatest(), log variance     (⚠ FIX 4)
--   • view uses security_invoker = on (PG17+) for tenant safety    (⚠ FIX 5)

-- ---------------------------------------------------------------------------
-- recipes — one row per (menu_item, inventory_ingredient) pair
-- ---------------------------------------------------------------------------

create table public.recipes (
  id                  uuid        primary key default gen_random_uuid(),
  restaurant_id       uuid        not null references public.restaurants(id) on delete cascade,
  menu_item_id        uuid        not null references public.items(id) on delete cascade,
  inventory_item_id   uuid        not null references public.inventory_items(id) on delete restrict,
  quantity            numeric(12,4) not null check (quantity > 0),
  unit                text        not null,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (menu_item_id, inventory_item_id)
);

create index recipes_restaurant_idx on public.recipes (restaurant_id);
create index recipes_menu_item_idx  on public.recipes (menu_item_id);
create index recipes_inv_item_idx   on public.recipes (inventory_item_id);

create trigger recipes_touch_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();  -- fn exists since 0010

-- RLS: tenant read, manager/owner write
alter table public.recipes enable row level security;

create policy "recipes tenant read" on public.recipes
  for select using (restaurant_id = public.my_restaurant_id());

create policy "recipes manager write" on public.recipes
  for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

-- ---------------------------------------------------------------------------
-- inventory_variances — audit log when stock would go below zero
-- ---------------------------------------------------------------------------

create table public.inventory_variances (
  id                  uuid        primary key default gen_random_uuid(),
  restaurant_id       uuid        not null references public.restaurants(id) on delete cascade,
  inventory_item_id   uuid        not null references public.inventory_items(id) on delete cascade,
  order_id            uuid        references public.orders(id) on delete set null,
  menu_item_id        uuid        references public.items(id) on delete set null,
  expected_deduction  numeric(12,4) not null,
  available_stock     numeric(12,4) not null,
  reason              text        not null default 'stock_went_negative',
  created_at          timestamptz not null default now()
);

create index inv_variances_restaurant_idx on public.inventory_variances (restaurant_id, created_at desc);

alter table public.inventory_variances enable row level security;

create policy "variances tenant read" on public.inventory_variances
  for select using (restaurant_id = public.my_restaurant_id());

-- Only the trigger (runs as the invoking session) inserts variance rows —
-- no direct write policy needed for authenticated users.

-- ---------------------------------------------------------------------------
-- menu_item_costs view — food cost + margin per menu item, tenant-safe
-- (security_invoker = on → runs under caller's RLS, not the view creator's)
-- ---------------------------------------------------------------------------

create view public.menu_item_costs with (security_invoker = on) as
select
  i.id                                                         as menu_item_id,
  i.restaurant_id,
  i.name_fr                                                    as name,       -- ⚠ FIX 2
  i.base_price,
  coalesce(sum(r.quantity * inv.unit_price_mad), 0)            as computed_cost, -- ⚠ FIX 1
  i.base_price
    - coalesce(sum(r.quantity * inv.unit_price_mad), 0)        as margin_mad,
  case when i.base_price > 0 then
    round(
      ((i.base_price - coalesce(sum(r.quantity * inv.unit_price_mad), 0))
       / i.base_price * 100)::numeric, 1
    )
  else null end                                                as margin_pct
from public.items i
left join public.recipes r         on r.menu_item_id        = i.id
left join public.inventory_items inv on inv.id              = r.inventory_item_id
group by i.id, i.restaurant_id, i.name_fr, i.base_price;

-- ---------------------------------------------------------------------------
-- get_available_menu RPC — returns items where stock covers at least one
-- serving, or items with no recipe (they're always available).
-- Stable + tenant-safe: filtered by rid argument, not caller session.
-- ---------------------------------------------------------------------------

create or replace function public.get_available_menu(rid uuid)
returns setof public.items
language sql stable security definer set search_path = public as
$$
  select i.*
  from public.items i
  where i.restaurant_id = rid
    and i.in_stock = true
    and (
      -- Item has no recipe → treat as always in stock
      not exists (
        select 1 from public.recipes r where r.menu_item_id = i.id
      )
      or
      -- Item has recipes but every ingredient has enough stock for ≥1 serving
      not exists (
        select 1
        from public.recipes r
        join public.inventory_items inv on inv.id = r.inventory_item_id
        where r.menu_item_id = i.id
          and inv.stock < r.quantity   -- less than one serving remaining
      )
    )
  order by i.sort_order;
$$;

-- ---------------------------------------------------------------------------
-- auto_deduct_inventory trigger — fires AFTER INSERT on orders.
-- Reads item_id (⚠ FIX 3), clamps at 0 with greatest() (⚠ FIX 4),
-- logs variance if stock would go negative.  Never throws → order is
-- never blocked by an inventory shortfall.
-- ---------------------------------------------------------------------------

create or replace function public.auto_deduct_inventory()
returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  line        jsonb;
  v_item_id   uuid;
  v_quantity  int;
  rec         record;
  deduction   numeric;
begin
  -- new.items is a jsonb array of OrderLine objects
  -- Shape: [{item_id, name, quantity, unit_price, options}, ...]
  for line in select jsonb_array_elements(new.items)
  loop
    v_item_id  := (line->>'item_id')::uuid;   -- ⚠ FIX 3: item_id not id
    v_quantity := (line->>'quantity')::int;

    -- For each recipe line linked to this menu item
    for rec in
      select r.id, r.inventory_item_id, r.quantity as recipe_qty,
             inv.stock as current_stock, inv.restaurant_id
      from public.recipes r
      join public.inventory_items inv on inv.id = r.inventory_item_id
      where r.menu_item_id = v_item_id
        and inv.restaurant_id = new.restaurant_id
    loop
      deduction := rec.recipe_qty * v_quantity;

      if rec.current_stock < deduction then
        -- Log the variance before clamping
        insert into public.inventory_variances (
          restaurant_id, inventory_item_id, order_id,
          menu_item_id, expected_deduction, available_stock, reason
        ) values (
          new.restaurant_id, rec.inventory_item_id, new.id,
          v_item_id, deduction, rec.current_stock, 'stock_went_negative'
        );
      end if;

      -- Always clamp at 0 — never throw (⚠ FIX 4)
      update public.inventory_items
      set stock = greatest(stock - deduction, 0)
      where id = rec.inventory_item_id;

    end loop;
  end loop;

  return new;
end;
$$;

create trigger orders_auto_deduct_inventory
  after insert on public.orders
  for each row execute function public.auto_deduct_inventory();

-- ---------------------------------------------------------------------------
-- Supabase Realtime — enable orders publication (needed by KDS in 0014)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.orders;

-- ---------------------------------------------------------------------------
-- Feature flag — add 'recipes' to the feature key constraint
-- ---------------------------------------------------------------------------

alter table public.restaurant_features drop constraint restaurant_features_feature_key_check;
alter table public.restaurant_features add constraint restaurant_features_feature_key_check
  check (feature_key in (
    'online_ordering', 'reservations', 'analytics', 'staff_management',
    'menu_editor', 'floor_plan', 'promotions', 'inventory', 'recipes'
  ));

notify pgrst, 'reload schema';
