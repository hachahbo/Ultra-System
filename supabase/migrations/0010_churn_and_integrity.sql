-- Darna v10 — Churn tracking + data integrity guards.
--
-- 1. subscriptions.canceled_at: the admin analytics churn/acquisition math
--    (0007-era, src/app/api/admin/analytics/route.ts) was using `updated_at`
--    as a cancellation-date proxy — any later edit to a canceled row (e.g. a
--    notes update) silently shifted which week it counted as "lost" in.
-- 2. Franchise tree guards: 0009 added restaurants.parent_restaurant_id with
--    no constraints — nothing stopped a self-reference or a grandchild
--    (branch-of-a-branch), which the admin franchise tree UI assumes never
--    happens (it only renders one level deep).
-- 3. orders.updated_at: the column has existed since 0002 but nothing ever
--    set it on UPDATE — it only reflected app code that happened to pass it
--    explicitly, making it untrustworthy as an optimistic-concurrency guard.

create or replace function public.set_updated_at()
returns trigger
language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- Churn tracking
-- ---------------------------------------------------------------------------

alter table public.subscriptions add column canceled_at timestamptz;
update public.subscriptions set canceled_at = updated_at where status = 'canceled';

-- ---------------------------------------------------------------------------
-- Franchise integrity (restaurants.parent_restaurant_id, added in 0009)
-- ---------------------------------------------------------------------------

alter table public.restaurants add constraint no_self_parent
  check (parent_restaurant_id is null or parent_restaurant_id <> id);

create or replace function public.reject_franchise_grandchildren()
returns trigger
language plpgsql as
$$
begin
  if new.parent_restaurant_id is not null
     and exists (
       select 1 from public.restaurants
       where id = new.parent_restaurant_id
         and parent_restaurant_id is not null
     ) then
    raise exception 'Franchise tree is limited to one level (branch of a branch not allowed)';
  end if;
  return new;
end
$$;

create trigger enforce_franchise_depth
  before insert or update on public.restaurants
  for each row execute function public.reject_franchise_grandchildren();

-- ---------------------------------------------------------------------------
-- orders.updated_at — make the column trustworthy
-- ---------------------------------------------------------------------------

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
