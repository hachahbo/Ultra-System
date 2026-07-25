-- ---------------------------------------------------------------------------
-- Events — public events + private hire inquiries
--
-- Two tables:
--   • events          — a restaurant's public happenings (jazz nights, tastings,
--                        theme nights…) shown on /[slug]/events.
--   • event_inquiries — private venue-hire / large-group requests submitted by
--                        visitors (birthday, corporate, wedding, privatization).
--
-- RLS mirrors reservations (0001_init.sql): dashboard reads/writes are scoped to
-- my_restaurant_id(); public visitors read events server-side via the service
-- role (getPublicEvents), and public inquiry inserts go through the service role
-- in the POST route — both bypass RLS by design, so no anon policies here.
-- ---------------------------------------------------------------------------

create table public.events (
  id                        uuid primary key default gen_random_uuid(),
  restaurant_id             uuid not null references public.restaurants (id) on delete cascade,
  slug                      text not null,
  title                     text not null,
  tagline                   text,
  description               text,
  category                  text not null default 'live_music'
                              check (category in ('live_music', 'theme_night', 'tasting', 'dj_set', 'special_menu')),
  status                    text not null default 'upcoming'
                              check (status in ('upcoming', 'sold_out', 'cancelled', 'completed')),
  cover_image               text,
  badge_label               text,
  start_date                timestamptz not null,
  end_date                  timestamptz,
  doors_open                text,
  is_free_entry             boolean not null default true,
  ticket_price              numeric(10,2) not null default 0,
  currency                  text not null default 'MAD',
  minimum_spend_per_person  numeric(10,2) not null default 0,
  max_seats                 int,
  reserved_seats            int not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (restaurant_id, slug)
);

create table public.event_inquiries (
  id                    uuid primary key default gen_random_uuid(),
  restaurant_id         uuid not null references public.restaurants (id) on delete cascade,
  event_type            text not null
                          check (event_type in ('birthday', 'corporate', 'wedding', 'privatization', 'other')),
  full_name             text not null,
  email                 text not null,
  phone                 text not null,
  preferred_date        date,
  preferred_time_slot   text check (preferred_time_slot in ('lunch', 'evening', 'full_day')),
  guest_count           int not null check (guest_count between 1 and 1000),
  budget_estimated_mad  numeric(10,2),
  special_requests      text,
  status                text not null default 'pending'
                          check (status in ('pending', 'contacted', 'approved', 'rejected')),
  created_at            timestamptz not null default now()
);

create index events_restaurant_start_idx
  on public.events (restaurant_id, start_date desc);
create index event_inquiries_restaurant_created_idx
  on public.event_inquiries (restaurant_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.events          enable row level security;
alter table public.event_inquiries enable row level security;

-- events: owner + staff read within own restaurant; owner-only writes. Public
-- reads happen server-side via the service role (getPublicEvents).
create policy "events tenant read" on public.events
  for select using (restaurant_id = public.my_restaurant_id());
create policy "events owner write" on public.events
  for all using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- event_inquiries: owner + manager read; owner updates status. Public inserts
-- go through the service role (POST /api/events/private-inquiry).
create policy "event_inquiries tenant read" on public.event_inquiries
  for select using (
    restaurant_id = public.my_restaurant_id()
    and public.my_role() in ('owner', 'manager')
  );
create policy "event_inquiries owner update" on public.event_inquiries
  for update using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner')
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'owner');

-- ---------------------------------------------------------------------------
-- Supabase Realtime — event_inquiries powers the dashboard notification bell;
-- events is added too so the dashboard events list refreshes live.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_inquiries;

-- ---------------------------------------------------------------------------
-- Seed — two sample events for "Ô rendez-vous" (id 1111…, see seed_orendezvous.sql)
-- so the public /events page and dashboard aren't empty on first run.
-- ---------------------------------------------------------------------------
insert into public.events
  (restaurant_id, slug, title, tagline, description, category, status, badge_label,
   start_date, end_date, doors_open, is_free_entry, minimum_spend_per_person, max_seats, reserved_seats)
values
  ('11111111-1111-1111-1111-111111111111', 'soiree-jazz-live',
   'Soirée Jazz Live & Dîner Gourmand',
   'Une ambiance feutrée avec le Trio Jazz de Tanger',
   'Profitez d''un dîner d''exception accompagné par les meilleures mélodies jazz en direct. Menu spécial à 4 mains proposé par le chef.',
   'live_music', 'upcoming', 'Ce Vendredi',
   '2026-07-31T20:00:00Z', '2026-07-31T23:30:00Z', '19:30', true, 250, 50, 38),
  ('11111111-1111-1111-1111-111111111111', 'degustation-tapas-flamenco',
   'Dégustation de Tapas & Flamenco',
   'Voyage culinaire et spectacle andalou',
   'Une sélection de tapas maison accompagnée d''un spectacle de flamenco en direct.',
   'theme_night', 'sold_out', null,
   '2026-08-07T20:30:00Z', '2026-08-07T23:00:00Z', '20:00', true, 0, 40, 40);

notify pgrst, 'reload schema';
