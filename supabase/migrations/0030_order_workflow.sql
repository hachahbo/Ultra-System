-- Darna v30 — Role-based order workflow (order-workflow-Plan.md, Phase 0).
--
-- Replaces the 3-state fulfilment status ('new' | 'preparing' | 'done') with
-- the 6-state lifecycle the four roles actually work through:
--
--   pending ──approve──► confirmed ──[trigger]──► preparing
--     │  (waiter)            (system, same txn)        │
--     │                                                │ all station
--     │ reject                                         │ tickets bumped
--     ▼                                                ▼
--   cancelled                                        ready ──serve──► served
--                                                              (waiter)
--
-- The headline fix is that THREE triggers currently fire on `orders` INSERT
-- and therefore run before anyone has approved the order:
--
--   • orders_fan_to_kds          (0014) — kitchen sees the food immediately,
--                                         leaving no window to approve in
--   • orders_auto_deduct_inventory (0013) — stock is eaten by orders that
--                                           may now be cancelled
--
-- Both move onto the pending→confirmed transition here. auto_start_table_session
-- (0015) correctly stays on INSERT — the customer occupies the table from the
-- moment they order, approved or not.
--
-- ⚠ IMPLEMENTER'S NOTE for Phase 2: because the confirmed→preparing advance
-- happens in an AFTER UPDATE trigger, an `update ... returning *` that writes
-- 'confirmed' gets 'confirmed' back, not 'preparing' — the nested update lands
-- after the RETURNING snapshot is taken. PATCH /api/dashboard/orders/[id] must
-- re-select the row after approving rather than trusting its own RETURNING.

-- ---------------------------------------------------------------------------
-- 1. Status column — widen, backfill, re-default
--
-- Unlike 0002/0008 there is no need to hunt for an auto-generated constraint
-- name: 0002_admin_dashboard.sql:54 named it explicitly. Hunting would in fact
-- be WRONG here — 0026 added `payment_status` and `orders_paid_at_required`,
-- whose definitions also contain the substring 'status', so 0002's
-- `like '%status%'` probe would now match the wrong constraint.
-- ---------------------------------------------------------------------------

alter table public.orders drop constraint if exists orders_status_check;

-- Backfill before re-constraining. Must also happen before
-- enforce_order_transition exists, or the migration blocks itself.
--   new  → pending   (awaiting waiter approval)
--   done → served    (delivered to the table)
-- 'preparing' keeps its name but changes meaning: it now implies approval.
update public.orders set status = 'pending' where status = 'new';
update public.orders set status = 'served'  where status = 'done';

alter table public.orders alter column status set default 'pending';

alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'));

-- ---------------------------------------------------------------------------
-- 2. Lifecycle stamps — who moved the order, and when
--
-- Mirrors the paid_at/paid_by pair from 0026. The _at columns are written by
-- triggers (guaranteed); the _by columns are written by the API from the
-- session profile, since a trigger can only see auth.uid() when the caller is
-- session-bound — the public intake route uses the service role.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references public.profiles (id) on delete set null,
  add column if not exists ready_at     timestamptz,
  add column if not exists served_at    timestamptz,
  add column if not exists served_by    uuid references public.profiles (id) on delete set null;

-- Every historical order was fulfilled under the old flow, which recorded no
-- timestamps at all. Without this backfill every past order reads as "served
-- but never served", and the constraint below would reject the whole table.
update public.orders
set served_at = created_at
where status = 'served' and served_at is null;

-- Same guarantee 0026 makes for paid_at: a terminal state must carry its
-- timestamp, or anything sorting/filtering on it silently drops the row.
alter table public.orders
  add constraint orders_served_at_required
    check (status <> 'served' or served_at is not null);

-- ---------------------------------------------------------------------------
-- 3. State-machine enforcement + lifecycle stamping
--
-- This BEFORE trigger does two jobs deliberately kept in one place: it rejects
-- illegal transitions, and it stamps confirmed_at/ready_at/served_at. Stamping
-- here rather than in each of the three call sites is what makes
-- orders_served_at_required a real invariant instead of a promise the API has
-- to keep — every path into a state, system or client, goes through here.
--
-- Belt-and-braces behind the API guard. The RLS update policy
-- (0001_init.sql:163) is tenant-scoped but role-blind and status-blind, so
-- without this any authenticated staff member can write any status over any
-- other — including reviving a served order or skipping approval entirely.
--
-- NOTE the split of authority: confirmed→preparing and preparing→ready are
-- listed here because the SYSTEM triggers below must be able to perform them.
-- No client may write them — that half of the contract is enforced in
-- src/lib/order-flow.ts (Phase 1), which omits them from the client-writable
-- transition table.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_order_transition()
returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_allowed text[];
begin
  -- Most PATCHes touch customer_name/note/table_number and leave status alone.
  if new.status is not distinct from old.status then
    return new;
  end if;

  v_allowed := case old.status
    when 'pending'   then array['confirmed', 'cancelled']
    when 'confirmed' then array['preparing', 'cancelled']
    when 'preparing' then array['ready', 'cancelled']
    when 'ready'     then array['served', 'cancelled']
    -- 'served' and 'cancelled' are terminal. Correcting a mis-tapped "Servi"
    -- is deliberately not possible yet — see order-workflow-Plan.md §10.
    else array[]::text[]
  end;

  if not (new.status = any (v_allowed)) then
    raise exception
      'Illegal order transition: % -> % (order %)', old.status, new.status, new.id
      using errcode = 'check_violation';
  end if;

  -- Stamp on entry to each state. coalesce so an API that supplied its own
  -- value (alongside confirmed_by / served_by) wins, and one that did not
  -- still gets a timestamp.
  if new.status = 'confirmed' then
    new.confirmed_at := coalesce(new.confirmed_at, now());
  elsif new.status = 'ready' then
    new.ready_at := coalesce(new.ready_at, now());
  elsif new.status = 'served' then
    new.served_at := coalesce(new.served_at, now());
  end if;

  return new;
end;
$$;

create trigger orders_enforce_transition
  before update on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.enforce_order_transition();

-- ---------------------------------------------------------------------------
-- 4. Move the KDS fan-out onto approval (the P0 fix)
--
-- The function body is unchanged from 0014 — including its item_id and
-- options[] corrections — except for the trailing status advance, which makes
-- "approved" and "on the kitchen screen" the same atomic event. A confirmed
-- order with no KDS ticket cannot exist.
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

  -- v30: advance to 'preparing' in the same transaction. Safe from recursion —
  -- the trigger's WHEN clause only fires on a transition INTO 'confirmed', and
  -- this writes 'preparing'. confirmed_at was already stamped by the BEFORE
  -- trigger on the way into 'confirmed', and is not touched again.
  update public.orders
  set status = 'preparing'
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists orders_fan_to_kds on public.orders;

create trigger orders_fan_to_kds
  after update on public.orders
  for each row
  when (new.status = 'confirmed' and old.status is distinct from 'confirmed')
  execute function public.fan_order_to_kds();

-- ---------------------------------------------------------------------------
-- 4b. Orders that are BORN approved (the POS path)
--
-- The trigger above only fires on a transition INTO 'confirmed'. A waiter
-- taking an order at the table via POST /api/dashboard/orders is the approval,
-- so that route inserts status='confirmed' directly — and an INSERT fires no
-- UPDATE trigger. Without the mirror triggers below such an order would sit at
-- 'confirmed' for ever: never fanned out to the kitchen, never deducting stock.
--
-- OLD cannot be referenced in an INSERT trigger's WHEN clause, so these have to
-- be separate triggers rather than one INSERT OR UPDATE trigger.
--
-- The BEFORE trigger also closes the matching hole in enforce_order_transition,
-- which only guards UPDATEs: without it, an order could be INSERTed directly as
-- 'served' and skip the entire workflow.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_initial_order_status()
returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  -- 'pending'   — public QR intake, awaiting a waiter
  -- 'confirmed' — staff POS, approved by the act of being typed in
  if new.status not in ('pending', 'confirmed') then
    raise exception
      'Orders must be created as pending or confirmed, got % (order %)',
      new.status, new.id
      using errcode = 'check_violation';
  end if;

  -- The UPDATE path stamps this in enforce_order_transition; do the same here
  -- so confirmed_at is populated however the order reached the state.
  if new.status = 'confirmed' then
    new.confirmed_at := coalesce(new.confirmed_at, now());
  end if;

  return new;
end;
$$;

create trigger orders_enforce_initial_status
  before insert on public.orders
  for each row execute function public.enforce_initial_order_status();

create trigger orders_fan_to_kds_on_insert
  after insert on public.orders
  for each row
  when (new.status = 'confirmed')
  execute function public.fan_order_to_kds();

create trigger orders_auto_deduct_inventory_on_insert
  after insert on public.orders
  for each row
  when (new.status = 'confirmed')
  execute function public.auto_deduct_inventory();

-- ---------------------------------------------------------------------------
-- 5. Move inventory depletion onto approval too
--
-- ⚠ NOT IN THE ORIGINAL PLAN — found while implementing. auto_deduct_inventory
-- (0013_recipes.sql:189) also fires AFTER INSERT. That was defensible while
-- every order eventually reached 'done', but this migration introduces
-- 'cancelled': a waiter rejecting an order because an item is 86'd would leave
-- the deducted stock gone for good, with no restock path. Deducting on approval
-- instead means stock only moves for food the kitchen actually commits to.
--
-- The function body needs no change — it reads new.items / new.restaurant_id /
-- new.id, all equally valid on UPDATE. Only the trigger's event moves.
-- ---------------------------------------------------------------------------

drop trigger if exists orders_auto_deduct_inventory on public.orders;

create trigger orders_auto_deduct_inventory
  after update on public.orders
  for each row
  when (new.status = 'confirmed' and old.status is distinct from 'confirmed')
  execute function public.auto_deduct_inventory();

-- ---------------------------------------------------------------------------
-- 6. Derive 'ready' from station ticket completion
--
-- An order fans out to N station tickets — hot line, cold, bar. It is ready
-- when ALL of them are bumped, not when the first station finishes. A per-order
-- "Ready" button would let the cold station declare a table's food ready while
-- the grill is still working.
-- ---------------------------------------------------------------------------

create or replace function public.sync_order_ready_from_tickets()
returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_outstanding int;
begin
  select count(*) into v_outstanding
  from public.kds_tickets
  where order_id = new.order_id
    and status <> 'bumped';

  if v_outstanding = 0 then
    -- The status guard matters: tickets belonging to pre-v30 orders (already
    -- 'served') and to orders cancelled mid-prep must not be resurrected.
    update public.orders
    set status = 'ready'
    where id = new.order_id
      and status = 'preparing';
  end if;

  return new;
end;
$$;

create trigger kds_tickets_sync_order_ready
  after update on public.kds_tickets
  for each row
  when (new.status = 'bumped' and old.status is distinct from 'bumped')
  execute function public.sync_order_ready_from_tickets();

-- ---------------------------------------------------------------------------
-- 7. Repoint the table-session vacate
--
-- 0015_table_sessions.sql:77 tests `new.status = 'done'`, a value that no
-- longer exists. Left unchanged, table turnover analytics silently stops
-- recording — sessions would open and never close.
--
-- 'cancelled' deliberately does NOT vacate: a customer whose order is rejected
-- for a sold-out dish is still sitting at the table, usually reordering.
-- ---------------------------------------------------------------------------

create or replace function public.auto_vacate_table_session()
returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if new.status = 'served' and old.status <> 'served' then
    update public.table_sessions
    set status = 'completed', vacated_at = now()
    where order_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Indexes
--
-- ⚠ NOT IN THE ORIGINAL PLAN — found while implementing. orders_open_idx
-- (0012_indexes.sql:8) is a PARTIAL index predicated on `status <> 'done'`.
-- After the backfill no row is ever 'done' again, so the predicate matches
-- every row: the index silently degrades from "open orders only" to a full
-- copy of the table, which is both larger and useless for the query it was
-- built for. Rebuild against the real terminal states.
-- ---------------------------------------------------------------------------

drop index if exists public.orders_open_idx;
create index orders_open_idx on public.orders (restaurant_id)
  where status not in ('served', 'cancelled');

-- The waiter queue (/dashboard/service) filters on exactly this shape.
create index orders_restaurant_status_idx
  on public.orders (restaurant_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- 9. Keep cancelled orders out of revenue
--
-- ⚠ NOT IN THE ORIGINAL PLAN — found while implementing. get_order_aggregates
-- (0016) sums `total` over every order with no status filter, which was correct
-- while every order was real. A cancelled order has a non-zero `total` and
-- would now inflate both admin revenue and order_count.
--
-- The app-side revenue sums (src/lib/dashboard-stats.ts, the analytics route)
-- have the same hole and are NOT fixed here — they belong to Phase 4.
-- ---------------------------------------------------------------------------

create or replace function public.get_order_aggregates(days_back int default 30)
returns table (
  restaurant_id uuid,
  day date,
  revenue numeric,
  order_count bigint
)
language sql stable security definer set search_path = public as $$
  select restaurant_id,
         (created_at at time zone 'Africa/Casablanca')::date as day,
         sum(total) as revenue,
         count(*) as order_count
  from public.orders
  where created_at >= now() - (days_back || ' days')::interval
    and status <> 'cancelled'
  group by restaurant_id, (created_at at time zone 'Africa/Casablanca')::date;
$$;

grant execute on function public.get_order_aggregates to service_role;

notify pgrst, 'reload schema';
