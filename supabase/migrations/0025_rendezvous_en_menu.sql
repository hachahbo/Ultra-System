-- English menu for "Ô rendez-vous" (0023_content_i18n.sql).
--
-- Fills categories.i18n and items.i18n so the language switcher actually
-- changes the carte, not just the chrome around it. French stays in name_fr /
-- description_fr and remains the fallback for anything not listed here.
--
-- Matched on (restaurant_id, name_fr) rather than id: re-runnable, readable in
-- review next to the French source, and structurally unable to touch another
-- tenant's rows. Items whose French name is missing from the lists below are
-- simply left untranslated.
--
-- Translation policy:
--   • Proper nouns and established culinary terms keep their name —
--     "Tiramisu", "La Primavera", "Gambas « Al Ajillo »", "Café gourmand",
--     "Carpaccio", "Linguine", "Milanese", "Tataki". Translating these would be
--     wrong rather than helpful.
--   • Descriptions are ingredient lists, so they are rendered literally. This
--     is the one place a loose translation becomes a food-accuracy problem.

-- ── Categories ─────────────────────────────────────────────────────────────
with tr(name_fr, en_name) as (
  values
    ('Entrées',          'Starters'),
    ('Plats Principaux', 'Main Courses'),
    ('Accompagnements',  'Sides'),
    ('Desserts',         'Desserts')
)
update public.categories c
set i18n = c.i18n || jsonb_build_object('en', jsonb_build_object('name', tr.en_name))
from tr, public.restaurants r
where r.id = c.restaurant_id
  and r.slug = 'orendezvous'
  and c.name_fr = tr.name_fr;

-- ── Items ──────────────────────────────────────────────────────────────────
-- An empty en_desc means the dish has no French description either, so no
-- "description" key is written (jsonb_strip_nulls drops it) and the resolver
-- keeps falling back to French.
with tr(name_fr, en_name, en_desc) as (
  values
    -- Starters
    ('Salade grecque fantaisie', 'House Greek Salad',
     'Fresh tomatoes, crisp cucumbers, olives, finely sliced red onions, capers, feta cheese and house dressing.'),
    ('Salade de chèvre rôtie aux herbes', 'Herb-Roasted Goat Cheese Salad',
     'Baby leaves and fresh salads, goat cheese roasted with herbs and paprika, basil olive oil, served with garlic bread.'),
    ('La primavera', 'La Primavera',
     'Mesclun salad, rocket, beetroot leaves, grilled vegetables and burrata cream.'),
    ('Salade tomate et burrata', 'Tomato and Burrata Salad',
     'A variety of fresh and roasted tomatoes, basil and 250g of burrata.'),
    ('Croquettes de poulet', 'Chicken Croquettes',
     'Our famous chicken croquettes.'),
    ('Croquettes à l''encre de seiche', 'Squid Ink Croquettes',
     'Creamy fish croquettes flavoured with squid ink.'),
    ('Rillettes de thon', 'Tuna Rillettes',
     'Flaked tuna in olive oil, lifted with fresh lemon, capers and aromatic herbs, served with toasted bread.'),
    ('Guacamole à façon', 'House Guacamole',
     'Avocado with herbs, ginger, tomatoes, red onions and lemon juice, served with nachos.'),
    ('Gambas « Al Ajillo »', 'Gambas « Al Ajillo »',
     'A small pot of prawns with garlic and herbs.'),
    ('Calamars à la tomate', 'Calamari in Tomato Sauce',
     'Calamari rings in tomato sauce with aubergine, capers and a barbecue note.'),

    -- Main courses
    ('Filet de bœuf à la crème épinards', 'Beef Fillet with Creamed Spinach',
     'Served with potatoes.'),
    ('Carpaccio de bœuf en rouleau', 'Rolled Beef Carpaccio',
     'Sliced beef fillet, lemon dressing, pesto, capers and parmesan shavings.'),
    ('La Césare impériale', 'The Imperial Caesar',
     'Crispy chicken, romaine lettuce, parmesan, cherry tomatoes, croutons and house Caesar dressing.'),
    ('Poulet aux deux moutardes', 'Chicken with Two Mustards',
     'Chicken supreme, strong and wholegrain mustard, chicken stock reduced with vinegar, served with potatoes.'),
    ('Poulet à la sauce champignons', 'Chicken in Mushroom Sauce',
     'Served with grilled vegetables.'),
    ('Milanaise de poulet', 'Chicken Milanese',
     'Served with linguine in tomato sauce.'),
    ('Tataki de thon', 'Tuna Tataki',
     'Lightly seared tuna, red onions, sesame seeds and a soy bath.'),
    ('Filet de thon', 'Tuna Fillet',
     'Served with grilled vegetables.'),
    ('Pavé de saumon', 'Salmon Fillet',
     'Served with linguine in cream sauce.'),
    ('Aubergine féta gratinée', 'Gratinated Aubergine with Feta',
     'Aubergine rolls with feta, parmesan and tomato sauce, gratinated with mozzarella.'),

    -- Sides
    ('Potatoes',             'Potatoes',                 ''),
    ('Linguine à la tomate', 'Linguine in Tomato Sauce', ''),
    ('Linguine à la crème',  'Linguine in Cream Sauce',  ''),
    ('Légumes grillés',      'Grilled Vegetables',       ''),

    -- Desserts
    ('Salade de fruits',     'Fruit Salad',          ''),
    ('Tiramisu',             'Tiramisu',             ''),
    ('Fondant au chocolat',  'Chocolate Fondant',    ''),
    ('Café gourmand',        'Café Gourmand',        ''),
    ('Pain perdu gourmand',  'Gourmet French Toast', '')
)
update public.items i
set i18n = i.i18n || jsonb_build_object(
  'en',
  jsonb_strip_nulls(jsonb_build_object(
    'name', tr.en_name,
    'description', nullif(tr.en_desc, '')
  ))
)
from tr, public.restaurants r
where r.id = i.restaurant_id
  and r.slug = 'orendezvous'
  and i.name_fr = tr.name_fr;

-- ── About page prose ───────────────────────────────────────────────────────
-- about_body is entered through the site builder, so 0024 could not seed it.
-- Blank-line separated paragraphs, matching the split the About page does.
update public.restaurant_theme t
set i18n = t.i18n || jsonb_build_object(
  'en',
  coalesce(t.i18n -> 'en', '{}'::jsonb) || jsonb_build_object(
    'about_body',
    'A place designed like a home, so you feel good here at any hour.'
    || E'\n\n'
    || 'It is up to you to decide where you would rather settle in to eat: in our lounge, our winter garden, under our glass roof, or on our terrace — we welcome you all day long to share our passion for eating well.'
    || E'\n\n'
    || 'In our grocery, designed and fitted like a library, you can find every product you have tasted here, along with those made by the producers and artisans we work with.'
  )
)
from public.restaurants r
where r.id = t.restaurant_id
  and r.slug = 'orendezvous';
