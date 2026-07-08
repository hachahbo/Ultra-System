-- Pilot restaurant seed data (Tangier). Run after 0001_init.sql.
-- To create the owner login: invite a user in Supabase Auth, then insert their
-- profile row (see README "Create the owner account").

insert into public.restaurants
  (id, slug, name, whatsapp_number, phone, hours, currency, base_delivery_fee)
values (
  '11111111-1111-1111-1111-111111111111',
  'tacos-al-amin',
  'Tacos Al Amin',
  '212600000000',
  '+212 5 39 00 00 00',
  'Lun–Dim · 11h00 – 23h00',
  'MAD',
  15.00
);

-- Branding (moved off `restaurants` in 0005_bespoke_website_model.sql) lives
-- on restaurant_theme now — operator-owned, but seeded here so the pilot
-- restaurant's public site isn't blank out of the box.
insert into public.restaurant_theme (restaurant_id, address, about_body)
values (
  '11111111-1111-1111-1111-111111111111',
  'Avenue Mohammed VI, Tanger',
  'Depuis 2015, Tacos Al Amin sert les meilleurs tacos de Tanger. Des produits frais, des sauces maison et un accueil familial.'
);

insert into public.categories (id, restaurant_id, name_fr, name_ar, sort_order) values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Tacos',     'تاكوس',    1),
  ('21111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Burgers',   'برغر',     2),
  ('21111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Boissons',  'مشروبات',  3);

insert into public.items (restaurant_id, category_id, name_fr, name_ar, description_fr, base_price, in_stock, sort_order, customization_groups) values
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'Tacos Poulet', 'تاكوس دجاج', 'Poulet mariné, frites, fromage', 35.00, true, 1,
   '[{"title": {"fr": "Choix de sauce", "ar": "صلصة"}, "required": true, "max_selections": 2, "options": [{"name": "Algérienne", "price_modifier": 0}, {"name": "Biggy", "price_modifier": 0}, {"name": "Fromagère", "price_modifier": 2}]}]'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'Tacos Mixte', 'تاكوس مشكل', 'Poulet + viande hachée, frites, fromage', 45.00, true, 2,
   '[{"title": {"fr": "Choix de sauce", "ar": "صلصة"}, "required": true, "max_selections": 2, "options": [{"name": "Algérienne", "price_modifier": 0}, {"name": "Biggy", "price_modifier": 0}, {"name": "Fromagère", "price_modifier": 2}]}]'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111112', 'Burger Classic', 'برغر كلاسيك', 'Steak haché, cheddar, salade, tomate', 40.00, true, 1, '[]'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111112', 'Burger Double', 'برغر دوبل', 'Double steak, double cheddar', 55.00, true, 2, '[]'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111113', 'Coca-Cola 33cl', 'كوكا كولا', null, 8.00, true, 1, '[]'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111113', 'Eau minérale 50cl', 'ماء معدني', null, 5.00, true, 2, '[]');

-- ---------------------------------------------------------------------------
-- Super Admin pilot data: 4 more restaurants with varied plan/status/city, a
-- subscriptions row per restaurant (including the original Tacos Al Amin),
-- and a handful of orders each so the admin Overview/analytics charts aren't
-- empty. Run after 0003_super_admin.sql.
--
-- To create the super-admin login: invite/create a user in Supabase Auth
-- (same as the owner-account note below), then run:
--   insert into public.platform_admins (user_id) values ('<auth-user-uuid>');
-- ---------------------------------------------------------------------------

update public.restaurants set plan = 'pro', status = 'active', city = 'Tanger'
  where id = '11111111-1111-1111-1111-111111111111';

insert into public.restaurants
  (id, slug, name, whatsapp_number, phone, hours, currency, base_delivery_fee, plan, status, city)
values
  ('11111111-1111-1111-1111-111111111112', 'dar-lahwa', 'Dar Lahwa', '212600000001', '+212 5 39 00 00 01',
   'Lun–Dim · 12h00 – 00h00', 'MAD', 12.00, 'free', 'trial', 'Tanger'),
  ('11111111-1111-1111-1111-111111111113', 'pizza-rif', 'Pizza Rif', '212600000002', '+212 5 39 00 00 02',
   'Lun–Dim · 11h00 – 23h30', 'MAD', 10.00, 'enterprise', 'active', 'Tétouan'),
  ('11111111-1111-1111-1111-111111111114', 'sushi-bay', 'Sushi Bay', '212600000003', '+212 5 39 00 00 03',
   'Mar–Dim · 18h00 – 23h00', 'MAD', 20.00, 'pro', 'suspended', 'Tanger'),
  ('11111111-1111-1111-1111-111111111115', 'cafe-atlas', 'Café Atlas', '212600000004', '+212 5 39 00 00 04',
   'Lun–Dim · 07h00 – 22h00', 'MAD', 0.00, 'free', 'expired', 'Rabat');

insert into public.restaurant_theme (restaurant_id, address, about_body)
values
  ('11111111-1111-1111-1111-111111111112', 'Boulevard Pasteur, Tanger', 'Cuisine marocaine traditionnelle au cœur de Tanger.'),
  ('11111111-1111-1111-1111-111111111113', 'Avenue Hassan II, Tétouan', 'Pizzas au feu de bois, ingrédients locaux.'),
  ('11111111-1111-1111-1111-111111111114', 'Marina, Tanger', 'Sushi et cuisine japonaise avec vue sur la baie.'),
  ('11111111-1111-1111-1111-111111111115', 'Centre-ville, Rabat', 'Café et petite restauration, ambiance conviviale.');

insert into public.subscriptions
  (restaurant_id, plan_tier, status, billing_cycle, price_mad, trial_ends_at, current_period_end, provider, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'pro', 'active', 'monthly', 499.00, null, now() + interval '20 days', 'manual', 'Payé en espèces — juillet 2026'),
  ('11111111-1111-1111-1111-111111111112', 'free', 'trialing', 'monthly', 0.00, now() + interval '10 days', null, 'manual', null),
  ('11111111-1111-1111-1111-111111111113', 'enterprise', 'active', 'yearly', 12000.00, null, now() + interval '200 days', 'manual', 'Facture annuelle réglée par virement'),
  ('11111111-1111-1111-1111-111111111114', 'pro', 'past_due', 'monthly', 499.00, null, now() - interval '5 days', 'manual', 'Paiement en retard — compte suspendu'),
  ('11111111-1111-1111-1111-111111111115', 'free', 'canceled', 'monthly', 0.00, now() - interval '30 days', null, 'manual', 'Essai expiré, non converti');

insert into public.orders (restaurant_id, type, table_number, note, items, subtotal, delivery_fee, total, status, created_at)
select r.id, 'dine_in', '1', null,
  '[{"item_id": "00000000-0000-0000-0000-000000000000", "name": "Plat du jour", "quantity": 2, "unit_price": 45, "options": []}]'::jsonb,
  90, 0, 90, 'done', now() - (n || ' days')::interval
from public.restaurants r
cross join generate_series(1, 5) as n
where r.id in (
  '11111111-1111-1111-1111-111111111112',
  '11111111-1111-1111-1111-111111111113',
  '11111111-1111-1111-1111-111111111114',
  '11111111-1111-1111-1111-111111111115'
);
