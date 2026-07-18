-- Ô rendez-vous menu seed. Run after 0007_smart_menu.sql, against the
-- existing restaurant row (id below already exists — see supabase/seed.sql).
--
-- Replaces whatever categories/items currently belong to this restaurant
-- (the pilot seed's Tacos/Burgers/Boissons placeholder data) with the real
-- menu, then adds the "Menu Smart" combo promotion.

-- ---------------------------------------------------------------------------
-- Clear stale menu data for this restaurant only. Cascades to items.
-- ---------------------------------------------------------------------------

delete from public.categories where restaurant_id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

insert into public.categories (id, restaurant_id, name_fr, sort_order) values
  ('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Entrées',            1),
  ('51111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Plats Principaux',   2),
  ('51111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Accompagnements',    3),
  ('51111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Desserts',           4);

-- ---------------------------------------------------------------------------
-- Items — Entrées
-- ---------------------------------------------------------------------------

insert into public.items (restaurant_id, category_id, name_fr, description_fr, base_price, in_stock, sort_order, is_smart_menu_eligible, customization_groups) values
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Salade grecque fantaisie',
   'Tomates fraîches, concombres croquants, olives, oignons rouges ciselés, câpres, fromage féta et sauce fantaisie.', 70.00, true, 1, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Salade de chèvre rôtie aux herbes',
   'Jeunes pousses et salades fraîches, fromage de chèvre rôti aux herbes et au paprika, huile d''olive au basilic, servi avec pain à l''ail.', 80.00, true, 2, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'La primavera',
   'Salade de mesclun, roquette, feuilles de betteraves légumes grillés et crème burrata.', 90.00, true, 3, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Salade tomate et burrata',
   'Variété de tomates fraîches et rôties, basilique et burrata 250g.', 120.00, true, 4, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Croquettes de poulet',
   'Nos fameuses croquettes au poulet.', 50.00, true, 5, true, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Croquettes à l''encre de seiche',
   'Onctueuses croquettes de poisson parfumées à l''encre de seiche.', 60.00, true, 6, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Rillettes de thon',
   'Thon effiloché à l''huile d''olive, relevé de citron frais, câpres et herbes aromatiques, servi avec pain grillé.', 50.00, true, 7, true, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Guacamole à façon',
   'Avocats parfumés aux herbes, gingembre, tomates, oignons rouges, jus de citron et accompagnés de nachos.', 60.00, true, 8, true, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Gambas « Al Ajillo »',
   'Cassolette de gambas à l''ail et herbes.', 80.00, true, 9, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Calamars à la tomate',
   'Anneaux de calamars dans leur bain de sauce tomate, aubergines, câpres et goût barbecue.', 80.00, true, 10, false, '[]');

-- ---------------------------------------------------------------------------
-- Items — Plats Principaux
-- ---------------------------------------------------------------------------

insert into public.items (restaurant_id, category_id, name_fr, description_fr, base_price, in_stock, sort_order, is_smart_menu_eligible, customization_groups) values
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'Filet de bœuf à la crème épinards',
   'Accompagné de potatoes.', 240.00, true, 1, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'Carpaccio de bœuf en rouleau',
   'Filet de bœuf en tranches, vinaigrette citron, pesto, câpres et éclat de parmesan.', 140.00, true, 2, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'La Césare impériale',
   'Poulet crispy, laitue romaine, parmesan, tomates cerises, croûtons et sauce césar maison.', 90.00, true, 3, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'Poulet aux deux moutardes',
   'Suprême de poulet, moutarde forte et à l''ancienne, bouillon de poule réduit au vinaigre, accompagné de potatoes.', 90.00, true, 4, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'Poulet à la sauce champignons',
   'Accompagné de légumes grillés.', 90.00, true, 5, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'Milanaise de poulet',
   'Accompagnée de linguine à la sauce tomate.', 100.00, true, 6, true, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'Tataki de thon',
   'Thon légèrement saisi, oignons rouges, graines de sésames et bain de soja.', 100.00, true, 7, true, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'Filet de thon',
   'Accompagné de légumes grillés.', 120.00, true, 8, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'Pavé de saumon',
   'Accompagné de linguine à la crème.', 130.00, true, 9, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'Aubergine féta gratinée',
   'Roulés d''aubergines à la féta, parmesan et sauce tomate, gratinés à la mozzarella.', 90.00, true, 10, true, '[]');

-- ---------------------------------------------------------------------------
-- Items — Accompagnements
-- ---------------------------------------------------------------------------

insert into public.items (restaurant_id, category_id, name_fr, description_fr, base_price, in_stock, sort_order, is_smart_menu_eligible, customization_groups) values
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111113', 'Potatoes',              null, 30.00, true, 1, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111113', 'Linguine à la tomate',  null, 30.00, true, 2, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111113', 'Linguine à la crème',   null, 30.00, true, 3, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111113', 'Légumes grillés',       null, 30.00, true, 4, false, '[]');

-- ---------------------------------------------------------------------------
-- Items — Desserts
-- ---------------------------------------------------------------------------

insert into public.items (restaurant_id, category_id, name_fr, description_fr, base_price, in_stock, sort_order, is_smart_menu_eligible, customization_groups) values
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111114', 'Salade de fruits',       null, 35.00, true, 1, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111114', 'Tiramisu',               null, 45.00, true, 2, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111114', 'Fondant au chocolat',    null, 55.00, true, 3, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111114', 'Café gourmand',          null, 40.00, true, 4, false, '[]'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111114', 'Pain perdu gourmand',    null, 45.00, true, 5, false, '[]');

-- ---------------------------------------------------------------------------
-- Menu Smart combo: 1 Entrée + 1 Plat Principal, from items where
-- is_smart_menu_eligible = true, for a fixed 135 MAD.
-- ---------------------------------------------------------------------------

insert into public.promotions (id, restaurant_id, name, description, price, sort_order, rules) values (
  '61111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'Menu Smart',
  'Choisissez 1 Entrée et 1 Plat Principal parmi une sélection.',
  135.00,
  1,
  jsonb_build_array(
    jsonb_build_object('category_id', '51111111-1111-1111-1111-111111111111', 'count', 1),
    jsonb_build_object('category_id', '51111111-1111-1111-1111-111111111112', 'count', 1)
  )
);
