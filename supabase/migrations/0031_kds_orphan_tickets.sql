-- Darna v31 — Retire the 0014-era KDS tickets that 0030 left behind.
--
-- 0014 fanned every order out to station tickets AFTER INSERT, so a ticket
-- existed from the moment a customer submitted — before anyone approved it.
-- 0030 moved the fan-out onto the pending→confirmed transition, but it did not
-- reckon with the tickets 0014 had already created. An order that predates the
-- migration therefore ends up fanned out TWICE:
--
--   2026-08-07  order inserted   → 0014 makes ticket A (never bumped: the KDS
--                                  was locked behind the `pro` plan)
--   2026-08-28  waiter approves  → 0030 makes ticket B, kitchen bumps it
--
-- sync_order_ready_from_tickets (0030 §6) counts tickets where status <>
-- 'bumped'. Ticket A is still pending, so v_outstanding is 1, the order never
-- reaches 'ready', and it is stranded in 'preparing' for ever — the kitchen
-- sees a finished ticket while the waiter's board shows the food still cooking.
--
-- Two jobs here: stop it happening again, then repair the rows it already hit.

-- ---------------------------------------------------------------------------
-- 1. Make the fan-out idempotent
--
-- In the post-0030 world a given order can only fan out once (the UPDATE
-- trigger fires on entry to 'confirmed'; the INSERT trigger on being born
-- 'confirmed'; never both). This guard is belt-and-braces for that, and it is
-- what makes re-approving a repaired order safe. Only PENDING tickets are
-- cleared — a bumped ticket is a record of work the kitchen actually did and
-- must survive.
-- ---------------------------------------------------------------------------

create or replace function public.fan_order_to_kds()
returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  line         jsonb;
  v_item_id    uuid;
  v_station_id uuid;
  station_lines jsonb := '{}';
  sid_key       text;
  existing_lines jsonb;
begin
  -- v31: never leave a stale unbumped ticket behind to block the order.
  delete from public.kds_tickets
  where order_id = new.id and status = 'pending';

  for line in select jsonb_array_elements(new.items)
  loop
    v_item_id := (line->>'item_id')::uuid;

    select station_id into v_station_id
    from public.items
    where id = v_item_id;

    sid_key := coalesce(v_station_id::text, 'null');

    existing_lines := coalesce(station_lines->sid_key, '[]'::jsonb);
    station_lines := jsonb_set(
      station_lines,
      array[sid_key],
      existing_lines || jsonb_build_array(
        jsonb_build_object(
          'item_id',  v_item_id,
          'name',     line->>'name',
          'quantity', (line->>'quantity')::int,
          'options',  coalesce(line->'options', '[]'::jsonb)
        )
      )
    );
  end loop;

  for sid_key, existing_lines in select * from jsonb_each(station_lines)
  loop
    v_station_id := case when sid_key = 'null' then null else sid_key::uuid end;

    insert into public.kds_tickets (restaurant_id, order_id, station_id, lines)
    values (new.restaurant_id, new.id, v_station_id, existing_lines);
  end loop;

  update public.orders
  set status = 'preparing'
  where id = new.id;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Delete tickets on orders nobody has approved yet
--
-- Under 0030 a ticket may not exist before approval, so every ticket on a
-- 'pending' order is a 0014 artifact by definition. Left alone, each one
-- strands its order the moment a waiter approves it.
-- ---------------------------------------------------------------------------

delete from public.kds_tickets t
using public.orders o
where t.order_id = o.id
  and o.status = 'pending';

-- ---------------------------------------------------------------------------
-- 3. Delete the orphans on orders that were already approved
--
-- A pending ticket older than its own order's approval cannot have come from
-- the 0030 fan-out, which runs at approval time. Anything bumped is real work
-- and is left untouched.
-- ---------------------------------------------------------------------------

delete from public.kds_tickets t
using public.orders o
where t.order_id = o.id
  and t.status = 'pending'
  and o.confirmed_at is not null
  and t.created_at < o.confirmed_at;

-- ---------------------------------------------------------------------------
-- 4. Release the orders the orphans were holding
--
-- Deleting a ticket fires no trigger (sync_order_ready_from_tickets is AFTER
-- UPDATE), so the orders stranded in 'preparing' need an explicit nudge. The
-- `exists` clause is what keeps this honest: an order with no tickets at all
-- was never fanned out, so its food was never cooked and it must NOT be
-- declared ready. enforce_order_transition (0030 §3) permits preparing→ready
-- and stamps ready_at on the way through.
-- ---------------------------------------------------------------------------

update public.orders o
set status = 'ready'
where o.status = 'preparing'
  and exists (select 1 from public.kds_tickets t where t.order_id = o.id)
  and not exists (
    select 1 from public.kds_tickets t
    where t.order_id = o.id and t.status <> 'bumped'
  );

notify pgrst, 'reload schema';
