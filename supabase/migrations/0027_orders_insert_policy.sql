-- Darna v27 — orders was missing an INSERT policy for authenticated staff.
--
-- 0001_init.sql gave `orders` "tenant read" and "tenant update" policies but
-- never "tenant insert". The public /api/orders route never noticed because
-- it uses the service-role client, which bypasses RLS — but the dashboard
-- POS route (POST /api/dashboard/orders, session-bound/RLS-scoped) has been
-- rejected by Postgres on every attempt: `42501: new row violates row-level
-- security policy for table "orders"`. Confirmed live via e2e/crud.spec.ts.
--
-- Scoped the same way as the sibling "tenant update" policy: any
-- authenticated staff member of the restaurant, not just owner/manager —
-- the API route itself (requireSession()) is the real gate on who's allowed
-- to hit this endpoint at all.

create policy "orders tenant insert" on public.orders
  for insert
  with check (restaurant_id = public.my_restaurant_id());
