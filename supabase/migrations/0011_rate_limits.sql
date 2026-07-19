-- Darna v11 — Rate limiting for public writes (orders/reservations had no
-- throttle at all; anyone could flood a tenant's kitchen with fake orders).
-- Single-datastore choice: a Postgres token-bucket table + atomic upsert
-- function, not Upstash/Redis — this project has one datastore
-- (Supabase Postgres) and adding Redis for this alone isn't worth the extra
-- account/env-var/network-hop for a pilot-scale app. Service-role only.

create table public.rate_limits (
  key           text primary key,
  window_start  timestamptz not null default now(),
  count         int not null default 1
);

alter table public.rate_limits enable row level security;
-- No policies — service role only (same shape as restaurant_theme/platform_admins).

-- Atomic check-and-increment: resets the window if expired, otherwise bumps
-- the counter. The ON CONFLICT DO UPDATE is a single atomic statement per
-- row, so concurrent requests for the same key can't race each other into
-- double-counting or double-resetting.
create or replace function public.check_rate_limit(
  p_key text,
  p_window_seconds int,
  p_limit int
)
returns table(allowed boolean, current_count int)
language plpgsql as
$$
declare
  v_count int;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case
      when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
        then 1
        else public.rate_limits.count + 1
      end,
    window_start = case
      when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
        then now()
        else public.rate_limits.window_start
      end
  returning public.rate_limits.count into v_count;

  return query select v_count <= p_limit, v_count;
end;
$$;
