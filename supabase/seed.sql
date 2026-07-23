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
  'Un lieu pensé comme une maison pour que vous vous y sentiez bien à tout moment.

À vous de décider où vous préférez vous installer pour vous restaurer : dans notre salon, notre jardin d’hiver, sous notre verrière, ou sur notre terrasse, nous vous accueillons toute la journée pour partager avec vous notre passion du bien manger. Dans notre épicerie pensée et menuisée comme une bibliothèque, vous pouvez retrouver tous les produits que vous avez dégustés, ainsi que ceux réalisés par les producteurs et artisans avec lesquels nous collaborons.'
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

-- ---------------------------------------------------------------------------
-- Inventory pilot data (Tacos Al Amin). Run after 0006_inventory.sql.
-- ---------------------------------------------------------------------------

insert into public.inventory_categories (id, restaurant_id, name, sort_order) values
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Boissons', 1),
  ('31111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Viandes & Protéines', 2),
  ('31111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Légumes & Frais', 3),
  ('31111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Épicerie sèche', 4);

insert into public.inventory_items (restaurant_id, category_id, name, unit, stock, min_threshold, unit_price_mad) values
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'Lait entier', 'Litres', 24, 15, 12),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'Coca-Cola (canettes)', 'unités', 8, 24, 4),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'Café en grains', 'kg', 12, 5, 90),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'Jus d''orange frais', 'Litres', 0, 6, 12),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111112', 'Porc (Al Pastor)', 'kg', 18, 10, 90),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111112', 'Bœuf haché', 'kg', 6, 8, 90),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111112', 'Poulet mariné', 'kg', 22, 10, 90),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111113', 'Tomates', 'kg', 14, 8, 8),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111113', 'Oignons', 'kg', 20, 6, 6),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111113', 'Avocats', 'unités', 5, 20, 4),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111113', 'Coriandre', 'bottes', 9, 5, 15),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111114', 'Tortillas de maïs', 'paquets', 30, 12, 25),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111114', 'Pains burger', 'unités', 42, 24, 4),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111114', 'Riz', 'kg', 16, 8, 9);

insert into public.suppliers (id, restaurant_id, name, category, status) values
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Ferme Bellevue', 'Légumes & frais', 'active'),
  ('41111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Boucherie Martin', 'Viandes', 'active'),
  ('41111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Distrib'' Boissons 24', 'Boissons', 'follow_up'),
  ('41111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Grossiste Épicerie Sud', 'Épicerie sèche', 'active');

insert into public.deliveries (restaurant_id, supplier_id, label, eta_at, urgent) values
  ('11111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111112', 'Bœuf haché · 20kg', now() + interval '4 hours', true),
  ('11111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111113', 'Coca-Cola · 5 packs', now() + interval '1 day', false),
  ('11111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', 'Avocats · 60u', now() + interval '3 days', false);
