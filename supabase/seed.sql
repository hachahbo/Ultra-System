-- Pilot restaurant seed data (Tangier). Run after 0001_init.sql.
-- To create the owner login: invite a user in Supabase Auth, then insert their
-- profile row (see README "Create the owner account").

insert into public.restaurants
  (id, slug, name, whatsapp_number, phone, address, hours, currency, base_delivery_fee, about_text)
values (
  '11111111-1111-1111-1111-111111111111',
  'tacos-al-amin',
  'Tacos Al Amin',
  '212600000000',
  '+212 5 39 00 00 00',
  'Avenue Mohammed VI, Tanger',
  'Lun–Dim · 11h00 – 23h00',
  'MAD',
  15.00,
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
