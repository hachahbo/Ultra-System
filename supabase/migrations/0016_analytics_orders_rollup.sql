-- Darna v16 — Admin analytics: pre-aggregate the orders scan.
--
-- ROADMAP-PHASE7.md Task 7.3.3: /api/admin/analytics's only real scale
-- problem is the `orders` fetch (up to 20,000 raw rows, gte 30 days) used
-- only to build a 30-bucket daily revenue series and two per-restaurant
-- order counts. Everything else in that route (DAU/MAU via auth.users,
-- at-risk detection, franchise tree, recent signups) stays in JS — those
-- operate on small tables and/or need auth.users, which this RPC can't
-- reach anyway.

-- Buckets by Africa/Casablanca calendar day (DST-aware), matching the app's
-- own Casa-local day bucketing (src/lib/time.ts: dayBucket/casaOffsetMinutes)
-- — the route consumes `day` as-is, no further timezone shifting.
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
  group by restaurant_id, (created_at at time zone 'Africa/Casablanca')::date;
$$;

grant execute on function public.get_order_aggregates to service_role;
