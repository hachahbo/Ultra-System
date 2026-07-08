-- Darna v5 — Bespoke Website Model: branding moves off `restaurants` into a
-- new `restaurant_theme` table, owned exclusively by the Super Admin (the
-- "operator" who hand-builds each restaurant's public site). Owners keep only
-- operational fields (hours/phone/whatsapp/fees/toggles) on `restaurants`.
--
-- Ship-safe by construction: every color/font column is nullable and the
-- backfill leaves them NULL, so the public site's CSS-variable injection
-- (see src/lib/theme.ts) emits no override and every existing restaurant
-- keeps its exact current look until an operator explicitly sets a theme.

-- ---------------------------------------------------------------------------
-- restaurant_theme
-- ---------------------------------------------------------------------------

create table public.restaurant_theme (
  restaurant_id    uuid primary key references public.restaurants (id) on delete cascade,
  color_primary    text check (color_primary    ~ '^#[0-9a-fA-F]{6}$'),
  color_secondary  text check (color_secondary  ~ '^#[0-9a-fA-F]{6}$'),
  color_background text check (color_background ~ '^#[0-9a-fA-F]{6}$'),
  color_text       text check (color_text       ~ '^#[0-9a-fA-F]{6}$'),
  font_pair        text not null default 'darna-classic',
  logo_url         text,
  hero_image_urls  text[] not null default '{}',
  about_title      text,
  about_body       text,
  address          text,
  sections         jsonb not null default
    '[{"key":"hero","enabled":true},{"key":"specials","enabled":true},{"key":"welcome","enabled":true}]'::jsonb,
  custom_copy      jsonb not null default '{}'::jsonb,
  draft            jsonb,
  updated_at       timestamptz not null default now()
);

-- Service-role only (audit_logs precedent, 0003_super_admin.sql): RLS on, zero
-- policies. The public site reads via the service-role client inside a cached
-- helper (getPublicTheme) that explicitly excludes the `draft` column; the
-- operator's admin API also uses the service role. Owners never touch this
-- table — there is deliberately no owner-facing policy at all.
alter table public.restaurant_theme enable row level security;

-- ---------------------------------------------------------------------------
-- Backfill — one row per existing restaurant, carrying over the branding
-- values that are about to be dropped from `restaurants`.
-- ---------------------------------------------------------------------------

insert into public.restaurant_theme (restaurant_id, logo_url, address, about_body)
select id, logo_url, address, about_text from public.restaurants;

-- ---------------------------------------------------------------------------
-- Trim `restaurants` — branding lives on restaurant_theme now.
-- `name` stays: it's used in login/dashboard chrome and audit logs, and
-- shouldn't require a theme fetch to render.
-- ---------------------------------------------------------------------------

alter table public.restaurants
  drop column logo_url,
  drop column address,
  drop column about_text;

-- Force PostgREST to reload its schema cache immediately (we hit a stale-cache
-- issue with `tables` after 0002 — this avoids repeating it).
notify pgrst, 'reload schema';
