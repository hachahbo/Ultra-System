-- Darna v22 — Persist Ô rendez-vous's hero images into restaurant_theme.
--
-- hero_image_urls has been '{}' since it was introduced (0005) — the public
-- site's HeroImages component only ever rendered its own hardcoded fallback
-- paths (src/components/site/hero-images.tsx), never real DB-backed content.
-- This backfill points hero_image_urls at that restaurant's own photography
-- (already present under public/images/orendezvous/), so the hero section
-- reads from the database like every other storefront_content field added in
-- 0019 — same visual result, real data instead of a hardcoded fallback.
--
-- Keyed on restaurant_id (not slug): 0019's backfill keyed on
-- r.slug = 'orendezvous', but the seed data sets this restaurant's slug to
-- 'tacos-al-amin' — a mismatch that silently no-ops a slug-keyed backfill.
-- restaurant_id is the stable identifier every other seed script uses.
--
-- Guarded to only fill an empty array, so re-running this migration (or an
-- operator having since edited hero images via the Site Builder) is never
-- clobbered.

update public.restaurant_theme
set hero_image_urls = array[
  '/images/orendezvous/hero-default.webp',
  '/images/orendezvous/hero-pop-default.webp',
  '/images/orendezvous/orendezvous.tanger_1782412303_3927481511788834209_73557593345.jpg',
  '/images/orendezvous/orendezvous.tanger_1770820323_3830240942847468663_73557593345.jpg',
  '/images/orendezvous/orendezvous.tanger_1782412303_3927481512191507130_73557593345.jpg',
  '/images/orendezvous/orendezvous.tanger_1783019424_3932574417688072480_73557593345.jpg'
]
where restaurant_id = '11111111-1111-1111-1111-111111111111'
  and hero_image_urls = '{}';

notify pgrst, 'reload schema';
