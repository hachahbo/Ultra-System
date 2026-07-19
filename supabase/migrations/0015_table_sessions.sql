-- Darna v15 — Table Sessions & Turnover (Phase 6.3)
-- Adds table_sessions to track how long a table is occupied, enabling
-- turnover rate analytics. Auto-vacates when order is marked 'done'.

-- ---------------------------------------------------------------------------
-- table_sessions — track table occupancy duration
-- ---------------------------------------------------------------------------
create table public.table_sessions (
  id              uuid        primary key default gen_random_uuid(),
  restaurant_id   uuid        not null references public.restaurants(id) on delete cascade,
  table_id        uuid        not null references public.tables(id) on delete cascade,
  order_id        uuid        references public.orders(id) on delete set null,
  seated_at       timestamptz not null default now(),
  vacated_at      timestamptz,
  customer_count  int         not null default 1,
  status          text        not null default 'active'
                              check (status in ('active', 'completed'))
);

create index table_sessions_restaurant_active_idx 
  on public.table_sessions (restaurant_id, status) where status = 'active';

alter table public.table_sessions enable row level security;

create policy "sessions tenant read" on public.table_sessions
  for select using (restaurant_id = public.my_restaurant_id());

create policy "sessions tenant write" on public.table_sessions
  for all
  using (restaurant_id = public.my_restaurant_id())
  with check (restaurant_id = public.my_restaurant_id());

-- ---------------------------------------------------------------------------
-- Trigger: auto-create session when table is assigned to an order
-- ---------------------------------------------------------------------------
create or replace function public.auto_start_table_session()
returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_table_id uuid;
begin
  if new.type = 'dine_in' and new.table_number is not null then
    -- Find the actual UUID of the dining table from the number
    select id into v_table_id 
    from public.tables 
    where restaurant_id = new.restaurant_id and number = new.table_number;

    if found then
      -- End any dangling active session for this table
      update public.table_sessions
      set status = 'completed', vacated_at = now()
      where table_id = v_table_id and status = 'active';

      -- Start a new session linked to this order
      insert into public.table_sessions (restaurant_id, table_id, order_id, status)
      values (new.restaurant_id, v_table_id, new.id, 'active');
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_auto_start_session
  after insert on public.orders
  for each row execute function public.auto_start_table_session();

-- ---------------------------------------------------------------------------
-- Trigger: auto-vacate session when order status changes to 'done'
-- ---------------------------------------------------------------------------
create or replace function public.auto_vacate_table_session()
returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  -- If order is marked done, close the associated session
  if new.status = 'done' and old.status <> 'done' then
    update public.table_sessions
    set status = 'completed', vacated_at = now()
    where order_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

create trigger orders_auto_vacate_session
  after update on public.orders
  for each row execute function public.auto_vacate_table_session();

-- ---------------------------------------------------------------------------
-- table_turnover_metrics view — average duration by hour/day
-- ---------------------------------------------------------------------------
create view public.table_turnover_metrics with (security_invoker = on) as
select
  restaurant_id,
  date_trunc('hour', seated_at) as hour_bucket,
  count(*) as total_sessions,
  avg(extract(epoch from (vacated_at - seated_at)) / 60) as avg_duration_minutes
from public.table_sessions
where status = 'completed'
  and seated_at >= now() - interval '30 days'
group by 1, 2;

-- ---------------------------------------------------------------------------
-- Supabase Realtime — add table_sessions
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.table_sessions;

notify pgrst, 'reload schema';
