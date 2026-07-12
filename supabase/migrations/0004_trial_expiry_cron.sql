-- Trial/expiry sweep: flips trials whose trial_ends_at has passed to
-- 'expired' (restaurants.status) / 'past_due' (subscriptions.status).
-- No Node cron, no Redis queue — a single Postgres function, scheduled with
-- pg_cron where available.

create or replace function public.sweep_expired_trials()
returns void
language plpgsql security definer set search_path = public as
$$
begin
  update public.restaurants r
  set status = 'expired', updated_at = now()
  where r.status = 'trial'
    and exists (
      select 1 from public.subscriptions s
      where s.restaurant_id = r.id and s.trial_ends_at < now()
    );

  update public.subscriptions
  set status = 'past_due', updated_at = now()
  where status = 'trialing' and trial_ends_at < now();
end;
$$;

-- pg_cron isn't guaranteed to be available in every environment (e.g. some
-- local dev stacks). Schedule it if the extension is present; otherwise the
-- function still exists and can be invoked manually or from a scheduled
-- Supabase Edge Function.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema extensions;
    perform cron.schedule(
      'sweep-expired-trials',
      '0 * * * *',
      $cron$select public.sweep_expired_trials()$cron$
    );
  end if;
exception when others then
  -- pg_cron present but not usable in this environment (e.g. insufficient
  -- privileges on a local/dev instance) — the function remains callable
  -- manually, which is all local verification needs.
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end $$;
