-- English content for "Ô rendez-vous" (0023_content_i18n.sql).
--
-- Scope note: this seeds only the copy whose French source lives in a
-- migration — the values/testimonials/about cards written by
-- 0019_storefront_content.sql. The hero and specials copy, about_title and
-- about_body were entered through the site builder rather than seeded, so
-- their French text isn't knowable from this repo; the operator translates
-- those in the builder's new English tab. Anything left untranslated keeps
-- rendering French, which is the resolver's designed fallback.
--
-- values_items / testimonials are index-aligned with the base arrays: entry n
-- translates card n, and only the text travels (images stay shared).

update public.restaurant_theme t
set i18n = t.i18n || '{
  "en": {
    "custom_copy": {
      "about_bento_heading": "Welcome home!",
      "about_bento_body": "We welcome you all day long, for a quick stop or a longer stay, alone, with family or with friends. Sit down and enjoy a lovely moment over a glass, a coffee or a tea, and share our passion for eating well.",
      "about_daypart_heading": "Breakfast, lunch, afternoon tea, aperitivo, brunch, coffee, ...",
      "about_daypart_body": "Your happiness at any time of day. Our menu changes every two weeks with fresh, local ingredients.",
      "about_promo_heading": "Private hire",
      "about_promo_body": "Host your private events in a unique and welcoming setting."
    },
    "values_items": [
      {
        "title": "Welcome",
        "body": "At Ô rendez-vous everyone is received as if at home. Whether for a quick coffee or a shared meal, our team makes a point of creating a warm and sincere welcome."
      },
      {
        "title": "Sharing",
        "body": "The lounge, the winter garden, the terrace: so many spaces designed for getting together. Our ambition is to create unique moments of conviviality, alone, with family or with friends."
      },
      {
        "title": "Exacting standards",
        "body": "A menu that changes every two weeks, fresh and local produce, recipes crafted with care — high standards are the watchword of our kitchen, in every plate."
      }
    ],
    "testimonials": [
      {"text": "The lounge is a real cocoon where you can easily picture yourself settling in to chat with friends or read a book, surrounded by books and beautiful objects."},
      {"text": "It is a living space with many uses, ideal for meeting over an espresso, warm for lunch and comforting for reading a while."},
      {"text": "The croque of the week is making a name for itself. Original and indulgent, it delights the palate with its harmoniously combined flavours."}
    ]
  }
}'::jsonb
from public.restaurants r
where r.id = t.restaurant_id
  and r.slug = 'orendezvous';
