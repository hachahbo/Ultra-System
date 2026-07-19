-- Darna v18 — Labor: clock-in/clock-out shift tracking + optional hourly
-- cost per staff member (Phase 6.4.1-6.4.3). Payment (6.4.4) stays out of
-- scope here — externally blocked on CMI merchant onboarding.

-- ---------------------------------------------------------------------------
-- shifts — one row per clock-in; clock_out null while the shift is open
-- ---------------------------------------------------------------------------

create table public.shifts (
  id            uuid        primary key default gen_random_uuid(),
  restaurant_id uuid        not null references public.restaurants(id) on delete cascade,
  profile_id    uuid        not null references public.profiles(id) on delete cascade,
  clock_in      timestamptz not null default now(),
  clock_out     timestamptz,
  created_at    timestamptz not null default now()
);

create index shifts_restaurant_idx on public.shifts (restaurant_id, clock_in desc);

-- A person can only be clocked into one shift at a time.
create unique index shifts_one_active_per_profile
  on public.shifts (profile_id) where clock_out is null;

alter table public.shifts enable row level security;

-- Read: yourself, or anyone owner/manager can manage.
create policy "shifts self or manager read" on public.shifts
  for select using (
    restaurant_id = public.my_restaurant_id()
    and (profile_id = auth.uid() or public.my_role_can_manage())
  );

-- Clock yourself in.
create policy "shifts self clock in" on public.shifts
  for insert with check (
    restaurant_id = public.my_restaurant_id() and profile_id = auth.uid()
  );

-- Clock yourself out (or edit your own open shift).
create policy "shifts self update" on public.shifts
  for update using (
    restaurant_id = public.my_restaurant_id() and profile_id = auth.uid()
  ) with check (
    restaurant_id = public.my_restaurant_id() and profile_id = auth.uid()
  );

-- Owner/manager can fix any shift (forgotten clock-out, wrong time) or
-- remove one — full "for all" so it also covers delete.
create policy "shifts manager write" on public.shifts
  for all using (
    restaurant_id = public.my_restaurant_id() and public.my_role_can_manage()
  ) with check (
    restaurant_id = public.my_restaurant_id() and public.my_role_can_manage()
  );

-- ---------------------------------------------------------------------------
-- profiles.hourly_rate_mad — optional; labor cost is opt-in per person
-- ---------------------------------------------------------------------------

alter table public.profiles add column hourly_rate_mad numeric(10,2);

-- ---------------------------------------------------------------------------
-- labor_summary — hours + cost per person per day. security_invoker so it
-- runs under the caller's RLS (a staff member only ever sees their own row
-- here, same as the underlying shifts table).
-- ---------------------------------------------------------------------------

create view public.labor_summary with (security_invoker = on) as
select
  s.restaurant_id,
  s.profile_id,
  date_trunc('day', s.clock_in)::date as day,
  sum(extract(epoch from (coalesce(s.clock_out, now()) - s.clock_in)) / 3600) as hours,
  p.hourly_rate_mad,
  sum(extract(epoch from (coalesce(s.clock_out, now()) - s.clock_in)) / 3600)
    * coalesce(p.hourly_rate_mad, 0) as cost_mad
from public.shifts s
join public.profiles p on p.id = s.profile_id
group by s.restaurant_id, s.profile_id, date_trunc('day', s.clock_in), p.hourly_rate_mad;

notify pgrst, 'reload schema';
