-- Darna v17 — Real User Monitoring: store Core Web Vitals from real
-- visitors (ROADMAP-PHASE7.md Task 7.4.3).

create table public.web_vitals (
  id uuid primary key default gen_random_uuid(),
  pathname text not null,
  slug text,
  metric_name text not null check (metric_name in ('CLS', 'LCP', 'INP', 'FCP', 'TTFB')),
  value numeric not null,
  rating text check (rating in ('good', 'needs-improvement', 'poor')),
  connection_type text,
  device_category text,
  recorded_at timestamptz not null default now()
);

create index web_vitals_pathname_idx on public.web_vitals (pathname, recorded_at desc);
create index web_vitals_metric_idx on public.web_vitals (metric_name, recorded_at desc);

-- No RLS policies — written only via the service role from
-- /api/vitals (a public POST endpoint, but the table itself is otherwise
-- unreachable from the anon/authenticated roles), read only via
-- /api/admin/analytics/vitals which is gated by requireSuperAdmin().
alter table public.web_vitals enable row level security;

-- P75 per metric, per surface (storefront/dashboard/admin), last N days.
create or replace function public.get_web_vitals_p75(days_back int default 7)
returns table (
  surface text,
  metric_name text,
  p75 numeric,
  sample_count bigint,
  good_rate numeric
)
language sql stable security definer set search_path = public as $$
  select
    case
      when slug is not null then 'storefront'
      when pathname like '/dashboard%' then 'dashboard'
      when pathname like '/admin%' then 'admin'
      else 'other'
    end as surface,
    metric_name,
    percentile_cont(0.75) within group (order by value) as p75,
    count(*) as sample_count,
    (sum(case when rating = 'good' then 1 else 0 end)::numeric / count(*)) as good_rate
  from public.web_vitals
  where recorded_at >= now() - (days_back || ' days')::interval
  group by 1, 2
  order by 1, 2;
$$;

grant execute on function public.get_web_vitals_p75 to service_role;
