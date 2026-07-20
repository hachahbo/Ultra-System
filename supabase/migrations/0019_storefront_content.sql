-- Darna v19 — De-hardcode the public storefront's presentation layer.
--
-- Until now, several storefront sections rendered the same hardcoded
-- "Ô rendez-vous" content (photos, testimonials, About-page stats/copy)
-- for EVERY restaurant, regardless of slug — a real multi-tenancy gap: a
-- second restaurant's public site would have shown the first restaurant's
-- photos and reviews. This migration extends restaurant_theme with the
-- missing content fields (all nullable/empty-default, ship-safe by
-- construction — same pattern as 0005) and backfills Ô rendez-vous's row
-- with its own real content so its site is unchanged after the app code
-- switches from hardcoded JSX to reading these columns.
--
-- New restaurants get empty arrays / nulls: the components this feeds
-- (ValuesSection, TestimonialsSection, the About-page gallery/stat/bento
-- cards, the homepage Welcome grid, the Specials collage image) all treat
-- empty/null as "render nothing" rather than falling back to demo content.

alter table public.restaurant_theme
  add column welcome_gallery_urls text[] not null default '{}',
  add column values_items         jsonb  not null default '[]',
  add column testimonials         jsonb  not null default '[]',
  add column about_gallery_urls   text[] not null default '{}',
  add column about_rating         numeric check (about_rating is null or (about_rating >= 0 and about_rating <= 5)),
  add column about_review_count   integer check (about_review_count is null or about_review_count >= 0),
  add column about_map_url        text,
  add column specials_image_url   text,
  add column social_facebook_url  text,
  add column social_instagram_url text,
  add column social_twitter_url   text;

-- "values" joins the reserved section keys (chef/testimonials/gallery, from
-- 0005) that now have a real renderer. Both ship enabled by default —
-- harmless while values_items/testimonials are empty (the renderer skips
-- an enabled-but-empty section), and means an operator populating content
-- later doesn't also need a separate "turn the section on" step.
update public.restaurant_theme
set sections = sections || '[{"key":"values","enabled":true},{"key":"testimonials","enabled":true}]'::jsonb
where not (sections @> '[{"key":"values"}]'::jsonb)
  and not (sections @> '[{"key":"testimonials"}]'::jsonb);

-- ---------------------------------------------------------------------------
-- Backfill: Ô rendez-vous keeps its real content (previously hardcoded in
-- welcome-section.tsx, values-section.tsx, testimonials-section.tsx,
-- about/page.tsx, specials-section.tsx). Image paths point at
-- /images/orendezvous/ — all of this restaurant's photography was moved out
-- of the shared /images/ root into its own per-restaurant folder in this
-- same change (see repo: public/images/orendezvous/), establishing the
-- pattern every future restaurant's assets should follow
-- (public/images/<slug>/) instead of a flat shared folder.
--
-- values_items/testimonials text rewritten to match this restaurant's
-- actual "maison"/welcome-home voice (the pre-existing hardcoded values
-- copy said "Maison Loko" — a leftover from a different template that
-- never matched this restaurant's own branding; not carried forward). The
-- two gallery slots previously filled with the generic hero-default.webp
-- placeholder now use real Ô rendez-vous photography instead, since this
-- pass is specifically about restoring this restaurant's own brand.
-- ---------------------------------------------------------------------------

update public.restaurant_theme t
set
  welcome_gallery_urls = array[
    '/images/orendezvous/orendezvous.tanger_1754944082_highlight18054770264426605.jpg',
    '/images/orendezvous/orendezvous.tanger_1770308359_3825946276593598431_73557593345.jpg',
    '/images/orendezvous/orendezvous.tanger_1755003155_highlight18054770264426605.jpg',
    '/images/orendezvous/orendezvous.tanger_1777049699_3882496732303853455_73557593345.jpg'
  ],
  values_items = '[
    {
      "image_url": "/images/orendezvous/orendezvous.tanger_1770820323_3830240942847468663_73557593345.jpg",
      "title": "Accueil",
      "body": "Chez Ô rendez-vous, chacun est reçu comme à la maison. Que ce soit pour un café rapide ou un repas partagé, notre équipe met un point d''honneur à créer un accueil chaleureux et sincère."
    },
    {
      "image_url": "/images/orendezvous/orendezvous.tanger_1773861948_3855755933193214716_73557593345.jpg",
      "title": "Partage",
      "body": "Le salon, le jardin d''hiver, la terrasse : autant d''espaces pensés pour se retrouver. Notre ambition est de créer des moments uniques de convivialité, seul, en famille ou entre amis."
    },
    {
      "image_url": "/images/orendezvous/orendezvous.tanger_1770820323_3830240943015229907_73557593345.jpg",
      "title": "Exigence",
      "body": "Une carte qui évolue tous les 15 jours, des produits frais et locaux, des recettes travaillées avec soin — l''exigence est le maître-mot de notre cuisine, à chaque assiette."
    }
  ]'::jsonb,
  testimonials = '[
    {"text": "Le salon, est un véritable cocon où l''on imagine bien se poser pour discuter entre amis ou bien bouquiner, entouré de livres et de beaux objets."},
    {"text": "C''est un lieu de vie à usages multiples, idéal pour se retrouver autour d''un expresso, chaleureux pour déjeuner et réconfortant pour bouquiner un temps."},
    {"text": "Le croque de la semaine fait grand bruit. Original et gourmand il ravit les papilles par ses saveurs harmonieusement combinées."}
  ]'::jsonb,
  about_gallery_urls = array[
    '/images/orendezvous/orendezvous.tanger_1754944082_highlight18054770264426605.jpg',
    '/images/orendezvous/orendezvous.tanger_1770308359_3825946276593598431_73557593345.jpg',
    '/images/orendezvous/orendezvous.tanger_1782412303_3927481511788834209_73557593345.jpg',
    '/images/orendezvous/orendezvous.tanger_1777049699_3882496732303853455_73557593345.jpg'
  ],
  about_rating = 4.7,
  about_review_count = 518,
  about_map_url = 'https://maps.app.goo.gl/vPtc4puU6HnVEQWj6',
  specials_image_url = '/images/orendezvous/orendezvous.tanger_1777049699_3882496730961703431_73557593345.jpg',
  custom_copy = t.custom_copy || '{
    "about_bento_heading": "Bienvenue à la maison !",
    "about_bento_body": "Nous vous accueillons toute la journée, en coup de vent ou plus longtemps, seul, en famille ou entre amis. Venez vous attabler et passer un joli moment autour d''un verre, d''un café ou d''un thé et ainsi partager notre passion du bien manger.",
    "about_daypart_heading": "Petit déjeuner, déjeuner, goûter, apéro, brunch, café, ...",
    "about_daypart_body": "Votre bonheur à n''importe quel moment de la journée. Notre carte évolue tous les 15 jours avec des ingrédients frais et locaux.",
    "about_promo_heading": "Privatisation",
    "about_promo_body": "Organisez vos événements privés dans un cadre unique et chaleureux."
  }'::jsonb
from public.restaurants r
where r.id = t.restaurant_id
  and r.slug = 'orendezvous';

notify pgrst, 'reload schema';
