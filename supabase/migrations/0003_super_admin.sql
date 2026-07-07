-- Darna v3 — Super Admin platform layer: cross-tenant restaurant management,
-- subscriptions/plans, per-restaurant feature permissions, audit log.
-- Tenant isolation is untouched: profiles.restaurant_id stays not null and
-- every existing RLS policy/helper is unchanged. Admin access is a separate
-- surface (platform_admins + service-role client + requireSuperAdmin()),
-- never a role bolted onto profiles.

-- ---------------------------------------------------------------------------
-- Platform admins
-- ---------------------------------------------------------------------------

create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- Admins may see their own membership row (used by the client-side login
-- redirect to decide /admin vs /dashboard). No insert/update/delete policy —
-- managed exclusively via the service role.
create policy "platform_admins self read" on public.platform_admins
  for select using (user_id = auth.uid());

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.platform_admins where user_id = auth.uid()) $$;

-- ---------------------------------------------------------------------------
-- Restaurants: plan / status / city
-- ---------------------------------------------------------------------------

alter table public.restaurants add column plan text not null default 'free'
  check (plan in ('free', 'pro', 'enterprise'));
alter table public.restaurants add column status text not null default 'active'
  check (status in ('active', 'trial', 'suspended', 'expired'));
alter table public.restaurants add column city text;
alter table public.restaurants add column updated_at timestamptz not null default now();

update public.restaurants set city = 'Tanger' where city is null;

-- ---------------------------------------------------------------------------
-- Subscriptions (one row per restaurant)
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  restaurant_id            uuid not null unique references public.restaurants (id) on delete cascade,
  plan_tier                text not null default 'free'
    check (plan_tier in ('free', 'pro', 'enterprise')),
  status                   text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled')),
  billing_cycle            text not null default 'monthly'
    check (billing_cycle in ('monthly', 'yearly')),
  price_mad                numeric(10,2) not null default 0,
  trial_ends_at            timestamptz,
  current_period_end       timestamptz,
  provider                 text not null default 'manual' check (provider in ('manual', 'stripe')),
  provider_customer_id     text,
  provider_subscription_id text,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);

alter table public.subscriptions enable row level security;

-- Owner may read their own subscription (settings "Abonnement" card); no
-- tenant writes — billing changes are super-admin actions only.
create policy "subscriptions owner read" on public.subscriptions
  for select using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- ---------------------------------------------------------------------------
-- Restaurant feature overrides
-- ---------------------------------------------------------------------------

create table public.restaurant_features (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  feature_key   text not null check (feature_key in (
    'online_ordering', 'reservations', 'analytics', 'staff_management',
    'menu_editor', 'floor_plan', 'promotions'
  )),
  enabled       boolean not null,
  updated_at    timestamptz not null default now(),
  unique (restaurant_id, feature_key)
);

create index restaurant_features_restaurant_idx on public.restaurant_features (restaurant_id);

alter table public.restaurant_features enable row level security;

-- Tenant read (owner AND staff — nav gating needs it for everyone); no
-- tenant writes, overrides are set exclusively by the super admin.
create policy "restaurant_features tenant read" on public.restaurant_features
  for select using (restaurant_id = public.my_restaurant_id());

-- ---------------------------------------------------------------------------
-- Audit log — service role only, no RLS policies at all
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id                  uuid primary key default gen_random_uuid(),
  admin_id            uuid not null references auth.users (id),
  action              text not null,
  target_restaurant_id uuid references public.restaurants (id) on delete set null,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index audit_logs_target_created_idx on public.audit_logs (target_restaurant_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;
-- No select/insert/update/delete policies: RLS enabled with zero policies
-- means every role is denied by default except the service role, which
-- bypasses RLS entirely. Admin routes read/write this via createAdminClient().
