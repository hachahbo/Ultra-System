-- Darna v9 — Franchise/group support: a restaurant may optionally be a
-- branch of another restaurant (the parent = corporate/group account),
-- powering the Super Admin "Franchises & groupes" tree. Self-referencing,
-- nullable, no RLS change needed (restaurants already has public read).

alter table public.restaurants
  add column parent_restaurant_id uuid references public.restaurants (id) on delete set null;

create index restaurants_parent_idx on public.restaurants (parent_restaurant_id);
