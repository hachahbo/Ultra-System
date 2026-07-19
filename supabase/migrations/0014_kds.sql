-- Darna v14 — Real KDS: stations, kds_tickets, fan-out trigger, Realtime.
--
-- Corrections from ROADMAP-PHASE6.md:
--   • fan_order_to_kds reads line->>'item_id' not line->>'id'       (⚠ FIX 3)
--   • stores line->'options' (text[]) not line->'modifiers'          (⚠ FIX)
--   • alter publication ... add table kds_tickets (critical omission)(⚠ FIX 7)

-- ---------------------------------------------------------------------------
-- stations — production zones (e.g. "Cuisine chaude", "Froid", "Bar")
-- ---------------------------------------------------------------------------

create table public.stations (
  id            uuid        primary key default gen_random_uuid(),
  restaurant_id uuid        not null references public.restaurants(id) on delete cascade,
  name          text        not null,
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now()
);

create index stations_restaurant_idx on public.stations (restaurant_id, sort_order);

alter table public.stations enable row level security;

create policy "stations tenant read" on public.stations
  for select using (restaurant_id = public.my_restaurant_id());

create policy "stations manager write" on public.stations
  for all
  using (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage())
  with check (restaurant_id = public.my_restaurant_id() and public.my_role_can_manage());

-- ---------------------------------------------------------------------------
-- items.station_id — optional FK so a menu item routes to a specific station
-- ---------------------------------------------------------------------------

alter table public.items add column station_id uuid references public.stations(id) on delete set null;

-- ---------------------------------------------------------------------------
-- kds_tickets — one ticket per (order, station) combination
-- ---------------------------------------------------------------------------

create table public.kds_tickets (
  id            uuid        primary key default gen_random_uuid(),
  restaurant_id uuid        not null references public.restaurants(id) on delete cascade,
  order_id      uuid        not null references public.orders(id) on delete cascade,
  station_id    uuid        references public.stations(id) on delete set null,
  -- Snapshot of lines belonging to this station (subset of order.items)
  lines         jsonb       not null default '[]',
  status        text        not null default 'pending'
                            check (status in ('pending', 'bumped')),
  created_at    timestamptz not null default now(),
  bumped_at     timestamptz,
  updated_at    timestamptz not null default now()
);

create index kds_tickets_restaurant_status_idx on public.kds_tickets (restaurant_id, status, created_at desc);
create index kds_tickets_order_idx             on public.kds_tickets (order_id);

create trigger kds_tickets_touch_updated_at
  before update on public.kds_tickets
  for each row execute function public.set_updated_at();

alter table public.kds_tickets enable row level security;

create policy "kds_tickets tenant read" on public.kds_tickets
  for select using (restaurant_id = public.my_restaurant_id());

create policy "kds_tickets tenant write" on public.kds_tickets
  for all
  using (restaurant_id = public.my_restaurant_id())
  with check (restaurant_id = public.my_restaurant_id());

-- ---------------------------------------------------------------------------
-- fan_order_to_kds trigger — fires AFTER INSERT on orders.
-- Groups lines by station (NULL station → one catch-all ticket).
-- Reads item_id (⚠ FIX), stores options[] not modifiers (⚠ FIX).
-- ---------------------------------------------------------------------------

create or replace function public.fan_order_to_kds()
returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  line         jsonb;
  v_item_id    uuid;
  v_station_id uuid;
  -- Map station_id → accumulated lines array
  station_lines jsonb := '{}';
  sid_key       text;
  existing_lines jsonb;
begin
  -- Iterate over each order line
  for line in select jsonb_array_elements(new.items)
  loop
    v_item_id := (line->>'item_id')::uuid;   -- ⚠ FIX: item_id not id

    -- Look up the station for this menu item (may be null → catch-all)
    select station_id into v_station_id
    from public.items
    where id = v_item_id;

    -- Use 'null' string as map key for items with no station
    sid_key := coalesce(v_station_id::text, 'null');

    existing_lines := coalesce(station_lines->sid_key, '[]'::jsonb);
    -- Append line snapshot: {item_id, name, quantity, options}
    station_lines := jsonb_set(
      station_lines,
      array[sid_key],
      existing_lines || jsonb_build_array(
        jsonb_build_object(
          'item_id',  v_item_id,
          'name',     line->>'name',
          'quantity', (line->>'quantity')::int,
          'options',  coalesce(line->'options', '[]'::jsonb)  -- ⚠ FIX: options not modifiers
        )
      )
    );
  end loop;

  -- Create one kds_ticket per station group
  for sid_key, existing_lines in select * from jsonb_each(station_lines)
  loop
    v_station_id := case when sid_key = 'null' then null else sid_key::uuid end;

    insert into public.kds_tickets (restaurant_id, order_id, station_id, lines)
    values (new.restaurant_id, new.id, v_station_id, existing_lines);
  end loop;

  return new;
end;
$$;

create trigger orders_fan_to_kds
  after insert on public.orders
  for each row execute function public.fan_order_to_kds();

-- ---------------------------------------------------------------------------
-- kds_summary — all-day aggregated view of ticket throughput
-- ---------------------------------------------------------------------------

create view public.kds_summary with (security_invoker = on) as
select
  date_trunc('hour', t.created_at) as hour_bucket,
  t.restaurant_id,
  t.station_id,
  count(*)                          as total_tickets,
  count(*) filter (where t.status = 'bumped') as bumped_tickets,
  avg(extract(epoch from (t.bumped_at - t.created_at)) / 60)
    filter (where t.status = 'bumped')        as avg_bump_minutes
from public.kds_tickets t
where t.created_at >= now() - interval '24 hours'
group by 1, 2, 3;

-- ---------------------------------------------------------------------------
-- Supabase Realtime — enable kds_tickets so the KDS page gets live updates
-- orders already added in 0013; add kds_tickets here.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.kds_tickets;

-- ---------------------------------------------------------------------------
-- Feature flag — add 'kds' to the feature key constraint
-- ---------------------------------------------------------------------------

alter table public.restaurant_features drop constraint restaurant_features_feature_key_check;
alter table public.restaurant_features add constraint restaurant_features_feature_key_check
  check (feature_key in (
    'online_ordering', 'reservations', 'analytics', 'staff_management',
    'menu_editor', 'floor_plan', 'promotions', 'inventory', 'recipes', 'kds'
  ));

notify pgrst, 'reload schema';
