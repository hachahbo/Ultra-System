-- Darna v12 — Scale-prep indexes. Confirmed missing against pg_indexes
-- before writing this (profiles.restaurant_id had none; orders only had the
-- composite (restaurant_id, created_at desc), but admin analytics scans
-- created_at globally across all tenants with no restaurant filter).

create index profiles_restaurant_idx on public.profiles (restaurant_id);
create index orders_created_idx on public.orders (created_at desc);
create index orders_open_idx on public.orders (restaurant_id) where status <> 'done';
create index subscriptions_status_canceled_idx on public.subscriptions (status, canceled_at desc);
create index reservations_pending_idx on public.reservations (restaurant_id) where status = 'new';
