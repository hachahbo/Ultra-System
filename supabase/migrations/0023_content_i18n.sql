-- Content translations for the public site.
--
-- Until now every translatable field existed in exactly one language: the
-- `*_fr` columns on categories/items, and the plain text columns on events and
-- restaurant_theme. The public site can already switch its chrome between
-- French and English (next-intl, messages/*.json), but a restaurant's own
-- words — hero copy, dish names, event titles — had nowhere to live in a
-- second language.
--
-- One additive `i18n` jsonb column per content table, keyed by locale:
--
--   {"en": {"name": "...", "description": "..."}}
--
-- French stays in the existing columns and is the fallback for every missing
-- key, so this migration changes nothing about what the site renders today.
-- Adding Arabic or Spanish later means widening the resolver's locale union,
-- not another round of columns (contrast categories.name_ar / name_es from
-- 0001_init.sql, which never gained an `en` sibling).

alter table public.categories       add column if not exists i18n jsonb not null default '{}'::jsonb;
alter table public.items            add column if not exists i18n jsonb not null default '{}'::jsonb;
alter table public.events           add column if not exists i18n jsonb not null default '{}'::jsonb;
alter table public.restaurant_theme add column if not exists i18n jsonb not null default '{}'::jsonb;

comment on column public.categories.i18n is
  'Per-locale overrides, e.g. {"en":{"name":"Starters"}}. Falls back to name_fr.';
comment on column public.items.i18n is
  'Per-locale overrides, e.g. {"en":{"name":"...","description":"..."}}. Falls back to name_fr/description_fr.';
comment on column public.events.i18n is
  'Per-locale overrides for title/tagline/description/badge_label. Falls back to the base columns.';
comment on column public.restaurant_theme.i18n is
  'Per-locale overrides for about_title/about_body/custom_copy/values_items/testimonials. Falls back to the base columns.';
