-- Darna v32 — A terminal order must not leave live tickets behind.
--
-- Companion to the API change that stopped hiding pending tickets once they
-- age past the KDS window. That fix was necessary — a pending ticket is food
-- nobody has plated, and sync_order_ready_from_tickets (0030 §6) will not let
-- its order reach 'ready' until it is bumped, so hiding one stranded the order
-- permanently. But it also means every pending ticket now reaches the board,
-- including ones whose order has already finished, which the age cap used to
-- sweep out of sight.
--
-- Two sources of those:
--   • 0014-era tickets on orders backfilled 'done' → 'served' by 0030. Their
--     confirmed_at is null (the backfill stamped served_at, not confirmed_at),
--     so 0031's orphan sweep could not prove they were orphans and left them.
--   • Any order cancelled mid-preparation. Its tickets stay 'pending' for ever
--     — the kitchen is still being told to cook food nobody will collect.

-- ---------------------------------------------------------------------------
-- 1. Clear the backlog
--
-- Bumped tickets are left alone: they are the record of work the kitchen
-- actually did, and kds_summary reports on them.
-- ---------------------------------------------------------------------------

delete from public.kds_tickets t
using public.orders o
where t.order_id = o.id
  and t.status = 'pending'
  and o.status in ('served', 'cancelled');

-- ---------------------------------------------------------------------------
-- 2. Stop it recurring
--
-- Rejecting an order is the one case that matters in practice: 0030 moved
-- cancellation into the workflow, and a waiter cancelling a 'preparing' order
-- (an item 86'd, the customer left) otherwise leaves its tickets on the pass
-- for ever. 'served' is covered too, though the machine should never produce
-- one — an order only reaches 'ready' once every ticket is bumped.
--
-- DELETE, not bump: a bumped ticket asserts the kitchen plated the food, and
-- writing that about food nobody cooked would corrupt the bump-time averages
-- in kds_summary.
-- ---------------------------------------------------------------------------

create or replace function public.clear_tickets_on_terminal_order()
returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  delete from public.kds_tickets
  where order_id = new.id and status = 'pending';
  return new;
end;
$$;

create trigger orders_clear_tickets_on_terminal
  after update on public.orders
  for each row
  when (new.status in ('served', 'cancelled') and old.status is distinct from new.status)
  execute function public.clear_tickets_on_terminal_order();

notify pgrst, 'reload schema';
