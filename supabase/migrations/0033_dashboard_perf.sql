-- Darna 0033 — Dashboard read-path performance.
--
-- The dashboard is latency-bound, not CPU-bound: every table load paid 5
-- serial HTTPS round trips (proxy getUser → route getUser → profiles →
-- restaurants/features/theme → the actual data query). Locally each hop is
-- ~5ms and nobody notices; from a Vercel function in a different region than
-- the Supabase project each is 120–250ms, which is the whole 2.4s.
--
-- This migration removes two of those hops (§3) and fixes the per-row RLS
-- re-evaluation and the indexes that never matched the queries (§1, §2).

-- ---------------------------------------------------------------------------
-- 1. RLS: evaluate the tenant helpers ONCE per query, not once per row.
--
-- `restaurant_id = public.my_restaurant_id()` is a function call in a row
-- filter. Even though my_restaurant_id() is STABLE, Postgres re-runs it for
-- every candidate row — and each run is a lookup on profiles. Wrapping it in
-- a scalar subquery turns it into an InitPlan: evaluated once, folded into
-- the plan as a constant, which then drives an index scan on restaurant_id
-- instead of a seq scan + per-row filter.
--
-- Same policy semantics, same isolation guarantees — only the plan changes.
-- ---------------------------------------------------------------------------

drop policy if exists "orders tenant read" on public.orders;
create policy "orders tenant read" on public.orders
  for select using (restaurant_id = (select public.my_restaurant_id()));

drop policy if exists "orders tenant update" on public.orders;
create policy "orders tenant update" on public.orders
  for update using (restaurant_id = (select public.my_restaurant_id()))
  with check (restaurant_id = (select public.my_restaurant_id()));

drop policy if exists "reservations tenant read" on public.reservations;
create policy "reservations tenant read" on public.reservations
  for select using (restaurant_id = (select public.my_restaurant_id()));

drop policy if exists "reservations tenant update" on public.reservations;
create policy "reservations tenant update" on public.reservations
  for update using (restaurant_id = (select public.my_restaurant_id()))
  with check (restaurant_id = (select public.my_restaurant_id()));

drop policy if exists "customers owner read" on public.customers;
create policy "customers owner read" on public.customers
  for select using (
    restaurant_id = (select public.my_restaurant_id())
    and (select public.my_role()) = 'owner'
  );

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (id = (select auth.uid()));

drop policy if exists "kds_tickets tenant read" on public.kds_tickets;
create policy "kds_tickets tenant read" on public.kds_tickets
  for select using (restaurant_id = (select public.my_restaurant_id()));

-- ---------------------------------------------------------------------------
-- 2. Indexes that actually match the dashboard's WHERE clauses.
-- ---------------------------------------------------------------------------

-- orders_open_idx was `where status <> 'done'`. 0030 renamed 'done' → 'served'
-- and no row has carried status 'done' since — so the predicate is now true
-- for every row. It stopped being a partial index (it is a full index on
-- restaurant_id, redundant with the orders_restaurant_created_idx prefix) and
-- has been costing a write on every order insert for nothing.
drop index if exists public.orders_open_idx;

-- The overview page counts new customers by first_seen; the only customers
-- index is on (restaurant_id, last_order) which cannot serve that range scan.
create index if not exists customers_restaurant_first_seen_idx
  on public.customers (restaurant_id, first_seen desc);

-- The overview page reads a 14-day reservations series by created_at; the
-- existing indexes are on (restaurant_id, date, time) and a status='new'
-- partial — neither matches a created_at range.
create index if not exists reservations_restaurant_created_idx
  on public.reservations (restaurant_id, created_at desc);

-- Out-of-stock strip on the overview, and the 86'd list on the menu view.
-- Partial: in_stock = false is a small minority of rows.
create index if not exists items_restaurant_out_of_stock_idx
  on public.items (restaurant_id)
  where in_stock = false;

-- ---------------------------------------------------------------------------
-- 3. get_session_context() — one round trip instead of four.
--
-- getSessionContext() ran: profiles → then restaurants + restaurant_features
-- + restaurant_theme in parallel. That is two serial waits, and it runs on
-- every dashboard page AND every /api/dashboard/* route.
--
-- security definer because it reads profiles/restaurants for the caller's own
-- tenant; the WHERE clause is pinned to auth.uid() so it can only ever return
-- the calling user's own row. Columns are listed explicitly rather than
-- to_jsonb(p) so a future column added to profiles is not silently exposed.
-- ---------------------------------------------------------------------------

create or replace function public.get_session_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id',                   p.id,
      'restaurant_id',        p.restaurant_id,
      'role',                 p.role,
      'active',               p.active,
      'must_change_password', p.must_change_password,
      'consented_at',         p.consented_at
    ),
    'restaurant',     to_jsonb(r),
    'features',       coalesce(f.rows, '[]'::jsonb),
    'theme_logo_url', t.logo_url
  )
  from public.profiles p
  join public.restaurants r on r.id = p.restaurant_id
  left join lateral (
    select jsonb_agg(to_jsonb(rf)) as rows
    from public.restaurant_features rf
    where rf.restaurant_id = p.restaurant_id
  ) f on true
  left join public.restaurant_theme t on t.restaurant_id = p.restaurant_id
  where p.id = (select auth.uid())
    -- Soft-disabled team members lose dashboard access immediately, even with
    -- a live session cookie. Mirrors the check getSessionContext() did in TS.
    and p.active is distinct from false;
$$;

revoke execute on function public.get_session_context() from public, anon;
grant execute on function public.get_session_context() to authenticated;
