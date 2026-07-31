# Full-Site Translation Plan (FR ⇄ EN)

> **Status: implemented.** Phases 1–7 below have shipped. `messages/{fr,en}.json`
> now hold 316 keys in parity, every public-site component reads from them, and
> restaurant content translates through the `i18n` jsonb columns added by
> `0023_content_i18n.sql`. Two items are deliberately still open and are called
> out in §7: the URL strategy (locale is still cookie-only) and auto-translation.
> Remaining seed work is listed at the end of §5, Phase 6.

Goal: when a visitor flips the language switcher on a restaurant site
(`/{slug}` and all sub-pages), **every** visible string changes — nav, buttons,
labels, placeholders, validation errors, toasts, dates, and the restaurant's
own content (hero copy, dish names, event titles).

## 1. Where we are today

Already in place (commit 64077a2):

| Piece | File | State |
| --- | --- | --- |
| next-intl plugin + request config | `src/i18n/request.ts` | ✅ cookie-based (`NEXT_LOCALE`), no URL prefix |
| Locale constants / cookie | `src/i18n/config.ts` | ✅ `["fr","en"]`, default `fr` |
| Switcher + server action | `src/components/site/language-switcher.tsx`, `src/i18n/actions.ts` | ✅ sets cookie + `router.refresh()` |
| `<html lang>` | `src/app/layout.tsx` | ✅ locale-driven |
| Message catalogues | `messages/fr.json`, `messages/en.json` | ⚠️ only **76 keys**, 3 namespaces: `Nav`, `Footer`, `Events` |
| Components actually translated | `nav-bar`, `footer`, `events-section`, `language-switcher` | ⚠️ 4 of ~25 |

So the plumbing is done; the coverage is not. Two very different kinds of text
remain, and they need two different mechanisms:

- **Class A — static UI text** hardcoded in JSX (~200 strings across 20 files).
  Fix = move into `messages/*.json`.
- **Class B — tenant content from Postgres** (theme copy, about body, values,
  testimonials, menu category/item names + descriptions, events, promotions).
  The DB stores **one language per field** today, so no amount of message-file
  work can translate it. Fix = per-locale storage + a resolver + editor UI.

## 2. Class A inventory (measured, not estimated)

Counts are distinct hardcoded human-readable strings per file:

| File | ~strings | Notes |
| --- | --- | --- |
| `src/components/site/reservation-form.tsx` | 49 | labels, zod messages, toasts, hardcoded address/hours |
| `src/components/menu/menu-browser.tsx` | 46 | **includes hardcoded demo ingredient/blurb text** (see §6) |
| `src/components/site/sections/contact-form.tsx` | 29 | labels, subjects, success copy, address/hours |
| `src/components/menu/checkout-client.tsx` | 25 | form + cart + errors |
| `src/app/[slug]/about/page.tsx` | 12 | whole page is FR prose (see §6 — belongs in DB) |
| `src/components/menu/item-dialog.tsx` | 9 | a11y labels, ingredient UI |
| `src/components/site/sections/hero-section.tsx` | 8 | badge/scroll/animation labels |
| `src/components/site/category-carousel.tsx` | 6 | a11y arrows, "Voir la carte" |
| `src/components/menu/formules-section.tsx` | 4 | Smart Menu |
| `src/components/site/sections/{specials,testimonials,welcome,values}-section.tsx` | 4 | default headings ("Nos plats", "Bienvenue", …) |
| `src/app/[slug]/{menu,events,contact,checkout,reservation}/page.tsx` + `layout.tsx` + `loading.tsx` | 11 | headings, `generateMetadata`, feature-unavailable copy, "Chargement..." |
| `src/components/site/hero-content.tsx` | 5 | mixed EN/FR (`Book a table`, `Opening hours`, hardcoded address) |

**Total ≈ 200 strings → ~200 new keys**, organised as namespaces:
`Site`, `Menu`, `Cart`, `Reservation`, `Contact`, `About`, `Hero`, `Specials`,
`Values`, `Testimonials`, `Errors`, `A11y` (+ existing `Nav`, `Footer`, `Events`).

## 3. Class B: content translation model

### 3.1 Storage — one `i18n jsonb` column per content table

Avoid the `name_ar` / `name_es` column-per-language pattern already in `0001`
(it doesn't scale and has no `en`). Use one additive jsonb column, keyed by
locale, containing only the fields that are translatable:

```sql
-- supabase/migrations/0023_content_i18n.sql
alter table public.categories       add column i18n jsonb not null default '{}';
alter table public.items            add column i18n jsonb not null default '{}';
alter table public.events           add column i18n jsonb not null default '{}';
alter table public.restaurant_theme add column i18n jsonb not null default '{}';
```

Shapes (TypeScript, added to `src/lib/types.ts`, validated in `src/lib/schemas.ts`):

```ts
type LocaleCode = "en";                     // fr = the base columns
type ItemI18n     = { name?: string; description?: string };
type CategoryI18n = { name?: string };
type EventI18n    = { title?: string; tagline?: string; description?: string; badge_label?: string };
type ThemeI18n    = {
  custom_copy?: Partial<Record<CopyKey, string>>;
  about_title?: string;
  about_body?: string;
  values_items?: { title?: string; body?: string }[];   // index-aligned with base array
  testimonials?: { text?: string; author?: string }[];  // index-aligned
};
type I18nBag<T> = Partial<Record<LocaleCode, T>>;
```

`fr` is never stored in `i18n` — the existing `name_fr` / `title` / `about_body`
columns stay the source of truth and the fallback. Adding `ar`/`es` later is
just widening `LocaleCode`.

### 3.2 Resolver — one helper, applied at the data layer

```ts
// src/lib/i18n-content.ts
export function localize<T>(base: T, bag: I18nBag<Partial<T>> | null, locale: Locale): T
```

Apply it **once**, inside the existing server data functions so every consumer
gets already-localized rows and no component needs to know about `i18n`:

- `src/lib/menu.ts` → `getPublicMenu`, `getRestaurantBySlug`, `getPublicTheme`
- `src/lib/site-theme.ts` → `getSiteTheme` (must also localize `theme.draft`
  so Super Admin preview shows the right language)
- `src/lib/events.ts` → public event reads

Empty string ⇒ treated as missing ⇒ French fallback. Never render an empty
section because a translation is absent.

### 3.3 Editing UI — an FR/EN toggle in the authoring surfaces

| Surface | File | Change |
| --- | --- | --- |
| Site builder → Content | `src/components/admin/site-builder/panel-content.tsx` | FR/EN segmented control at panel top; while EN, inputs write `draft.i18n.en.*` and show the FR value as placeholder |
| Site builder → Sections | `panel-sections.tsx` | same for values/testimonials cards |
| Menu item form | `src/components/dashboard/item-form.tsx` | EN name + description fields |
| Menu manager (categories) | `src/components/dashboard/menu-manager.tsx` | EN category name |
| Event form | `src/components/dashboard/event-form.tsx` | EN title/tagline/description/badge |

API routes that write these rows (`/api/dashboard/items`, `.../categories`,
`.../events`, the theme draft/publish route) need `i18n` added to their zod
schemas and update payloads. The theme draft/publish flow already copies
`ThemeDraftFields`, so adding `i18n` to that type carries it through
draft → publish for free.

**Translation completeness indicator**: the builder shows `n/m EN fields
filled` per panel so the operator can see what will fall back to French.

## 4. Locale-aware formatting

- `src/lib/format.ts` hardcodes `toLocaleString("fr-MA", …)` → take a locale
  argument, map `fr → fr-MA`, `en → en-GB` (24h clock, MAD currency kept).
- date-fns: every public-site call imports `{ fr }` explicitly
  (`events-section.tsx`, `reservation-form.tsx`). Add
  `src/lib/date-locale.ts` exporting `dateFnsLocale(locale)` → `fr | enUS`,
  and pass it at every `format()` call on the public site.
- `react-day-picker` calendar in `reservation-form.tsx` takes a `locale` prop.
- Format patterns themselves differ (`EEEE d MMMM yyyy` vs `EEEE, MMMM d, yyyy`)
  → store the pattern **in the message files** (`Events.dateFormat`) rather than
  in code.
- `generateMetadata` in `[slug]/layout.tsx` + per-page metadata → use
  `getTranslations()` and the localized theme description.

## 5. Phasing

Each phase ends green on `npm run typecheck && npm run lint && npm run test`.

**Phase 1 — Class A, above the fold (≈45 keys)**
`hero-section`, `hero-content`, `specials-section`, `welcome-section`,
`values-section`, `testimonials-section`, `category-carousel`, `dish-card`,
`loading.tsx`, `[slug]/layout.tsx` (preview banner, unavailable notice, metadata).
Ships visible value immediately: the homepage flips entirely.

**Phase 2 — Class A, forms & flows (≈150 keys)**
`reservation-form`, `contact-form`, `checkout-client`, `item-dialog`,
`menu-browser`, `formules-section`, `feature-unavailable`, and the sub-page
headings. Includes zod messages and `toast()` strings — those are the ones most
often missed. Pattern for schemas: build them inside the component from `t()`,
or keep message *keys* in the schema and translate at render.

**Phase 3 — formatting layer (§4)**
Small, mechanical, but must land before Phase 4 QA to avoid "English page,
French date".

**Phase 4 — Class B storage + resolver (§3.1, §3.2)**
Migration `0023`, types, schemas, `localize()`, wired into `menu.ts`,
`site-theme.ts`, `events.ts`. No UI yet — English content simply falls back to
French, and nothing regresses.

**Phase 5 — Class B authoring UI (§3.3)**
The FR/EN toggle across the five forms + API schema updates. This is the phase
that actually lets "Ô rendez-vous" have an English hero and English dish names.

**Phase 6 — seed the real English content**
Delivered as `supabase/migrations/0024_rendezvous_en_content.sql`, mirroring how
`0019` seeded the French copy. It covers the copy whose French source lives in a
migration: the 3 values cards, 3 testimonials and the three About cards.

**Still to fill in (operator work, in the builder's new English tab):** hero
headline/sub/CTA, specials heading/sub, welcome heading, `about_title`,
`about_body`, plus menu category and dish names. Their French text was entered
through the site builder, not seeded, so it isn't knowable from this repo.
Everything left blank keeps rendering French.

**Phase 7 — QA** (all green: 88 unit tests, typecheck, lint, `next build`)
- `e2e/i18n.spec.ts` — per page and per locale: sets the `NEXT_LOCALE` cookie,
  asserts `<html lang>`, and sweeps `body.innerText` against a French-marker
  word list so a single missed string fails the build rather than shipping.
  Also drives the switcher itself. Needs a running server + live Supabase, same
  as the other e2e suites.
- `src/lib/i18n-content.test.ts` — the resolver's fallback behaviour: unknown
  locale, half-translated row, empty-string override, `custom_copy` merged key
  by key, index-aligned values/testimonials, no mutation of the source row.
- `src/lib/messages.test.ts` — `fr.json` / `en.json` key parity, no blank
  values, and matching ICU placeholders per key. Runs in `npm test`, so it
  gates commits through the existing husky hook without a separate script.

## 6. Two problems this work exposed — both fixed

1. **Fabricated per-dish content in `menu-browser.tsx`** — `getItemDetails()`
   matched the *French dish name* against keywords and returned invented
   ingredient lists ("Fleur de sel de Tanger" for anything named *potatoes*,
   "Crème d'épinards au parmesan" for anything named *filet*). Translating that
   would have locked fabricated food information into both languages, and it was
   wrong for every restaurant but the demo one. **Removed.** The accordion now
   reads the item's own `customization_groups` (the "Ingrédients" group
   convention `ItemDialog` already relies on) and otherwise shows a generic
   block. Dishes with no groups set show less detail than before — that is the
   intended trade: nothing invented.
2. **Other restaurants' data used as fallbacks.** `/{slug}/about` hardcoded
   three French paragraphs; `hero-content`, `reservation-form` and
   `contact-form` fell back to "Avenue Mohammed VI, Tanger", "Lun-Dim · 11h00 –
   23h00" and "+212 5 39 00 00 00" for *any* tenant. **Fixed.** The about intro
   renders `theme.about_body` (blank-line separated paragraphs) with generic
   translated copy as the only fallback, and the address/hours/phone blocks
   render only when that restaurant actually has the data — matching the
   convention already stated in `src/app/[slug]/page.tsx`.

### Known limitation

Cart option strings (`Sans oignons`, `Note: …`) stay canonical French even for
an English visitor. They are order data the kitchen reads in the (French)
dashboard, so translating them at the point of storage would push the
translation problem onto kitchen staff. The ingredient chips *display*
translated in `ItemDialog`; only the stored string is canonical.

## 7. Open decisions

1. **URL strategy.** Today the locale lives only in a cookie, so `/{slug}` serves
   two different languages at one URL — invisible to Google, and shared links
   don't carry the language. **Recommendation: keep the cookie for now** (the
   `[slug]` subtree is already fully dynamic — see the comment at
   `src/app/[slug]/layout.tsx:11` — so there is no caching cost), and treat
   `/{slug}/en/...` + `hreflang` as a separate SEO phase. Changing it later
   touches routing, not translations, so Phases 1–6 are not wasted either way.
2. **Auto-translation.** Optional Phase 5b: a "Translate to English" button in
   the site builder that calls Claude once per field and pre-fills `i18n.en` for
   the operator to review. Nice-to-have; the manual fields must exist first.
3. **Dashboard/admin i18n.** This plan covers the **public site** only, as asked.
   The owner dashboard and Super Admin are ~40 more files and are French-only;
   they can follow the exact same Class A pattern later.

## 8. Effort

| Phase | Scope | Rough size |
| --- | --- | --- |
| 1 | 10 files, 45 keys | S |
| 2 | 8 files, 150 keys | L |
| 3 | 5 files | S |
| 4 | migration + 4 lib files + types/schemas | M |
| 5 | 5 forms + 4 API routes | M |
| 6 | content seed SQL | M (writing/translating copy) |
| 7 | 1 e2e spec, 1 unit test, 1 CI script | S |

---

# Part 2 — Making the menu itself switch language

Written after the Part 1 work shipped and the language switcher still left dish
names, category tabs and descriptions in French.

## 1. Why nothing switches (root cause)

The mechanism from Part 1 is complete and correct. Two things stop it working:

**A. The migrations were never applied to the live database.** Verified against
the project's Supabase instance:

```
items.i18n            -> 42703 column does not exist
categories.i18n       -> 42703 column does not exist
restaurant_theme.i18n -> 42703 column does not exist
```

`supabase/migrations/0023_content_i18n.sql` exists in the repo but has not been
run. There is no migration runner in this project — README §Setup says schema
changes go through the Supabase SQL editor by hand — so writing the file was
never going to be enough.

**B. Even with the column, no English text exists.** `i18n` defaults to `{}`,
and the resolver's contract is "missing translation → French". So the switch
would still show French dish names until someone writes them.

### A live regression that must be fixed first

`getPublicTheme` reads an explicit column list, and Part 1 added `i18n` to it.
Against the current database that whole query returns **400**, so
`resolveTheme(null, …)` kicks in and the site renders `DEFAULT_THEME`: no brand
colours, no fonts, no hero images, no about text, no values, no testimonials.

Confirmed by running the exact select from `src/lib/menu.ts:146` against the
live project. **This ships broken unless 0023 is applied before the deploy.**

### Unrelated pre-existing breakage found on the way

`public.events` does not exist either — `0021_events.sql` was never applied.
The events page has been dead independently of any i18n work. Same fix
(apply the migration), separate problem; noted so it isn't mistaken for a
regression from this workstream.

## 2. Scope of the content to translate

Measured from the live DB. Only `orendezvous` has a menu; the other five
restaurants (`nezres`, `dar-lahwa`, `pizza-rif`, `sushi-bay`, `cafe-atlas`)
have zero categories and zero items, so they need nothing.

| Content | Count |
| --- | --- |
| Category names (`Entrées`, `Plats Principaux`, `Accompagnements`, `Desserts`) | 4 |
| Dish names | 29 |
| Dish descriptions (the other 9 items have none) | 20 |
| `about_body` (3 paragraphs) | 1 |
| values / testimonials / about cards | already covered by `0024` |
| hero / specials / welcome copy | not set in the DB — already served from `messages/*.json`, so already translated |

**≈ 54 strings.** Small enough to seed in one migration rather than build
tooling first.

## 3. Plan

### Phase A — unblock (must happen before anything else is visible)

1. Apply `0023_content_i18n.sql` in the Supabase SQL editor. This alone fixes
   the theme regression in §1.
2. Apply `0024_rendezvous_en_content.sql` (English values/testimonials/about
   cards, already written).
3. Apply `0021_events.sql` if the events feature is wanted — otherwise leave it
   and accept that `/[slug]/events` 500s.
4. **Harden the theme read** so a schema drift like this can never again
   silently blank a restaurant's branding: in `getPublicThemeRow`, check the
   Supabase `error` and throw rather than falling through to `resolveTheme(null)`.
   A hard failure surfaces in logs; a silent default looks like a design bug and
   cost a full debugging cycle here.

*Verification:* switch to English on `/orendezvous` — values, testimonials and
the About cards flip; dish names stay French (expected until Phase B).

### Phase B — seed the English menu

`supabase/migrations/0025_rendezvous_en_menu.sql`: one `update … set i18n =
i18n || '{"en":{…}}'::jsonb` per category and per item, matched on
`(restaurant_id, name_fr)` so it is re-runnable and cannot touch another
tenant's rows.

Translation notes worth deciding before writing:
- **Dish names that are proper nouns stay as-is** — `Tiramisu`, `La primavera`,
  `Gambas « Al Ajillo »`, `Carpaccio`, `Linguine`. Translating these would be
  wrong, not helpful. Roughly 8 of the 29 fall in this bucket and should keep
  their French/Italian/Spanish form with at most the article adjusted.
- **Descriptions are ingredient lists** — translate literally and keep them
  short; they are the one place a bad translation becomes a food-accuracy
  problem, so anything ambiguous gets left in French rather than guessed.
- `about_body` translates as three blank-line-separated paragraphs, matching
  the split the About page now does.

*Verification:* the e2e sweep in `e2e/i18n.spec.ts` already fails on French
markers; extend it with an explicit assertion that the menu page shows
`Starters`/`Main courses` in English mode.

### Phase C — keep it translated as the menu changes

Seeding is a one-off; the menu changes every two weeks (per the restaurant's
own about copy). Part 1 added English fields to the item form, the category
rename dialog and the event form, so translations *can* be maintained — but
one dish at a time, with no visibility into what is missing.

Add a **translation view to the menu manager**: a table of every category and
item with FR on the left and an editable EN column on the right, one save for
the whole menu, plus a per-row "missing" marker and a header count
("22/53 translated"). This is the difference between the feature being usable
and being technically present.

### Phase D — optional, only if Phase C proves tedious

A **"Translate to English" button** that sends the untranslated French strings
to Claude in one batch and pre-fills the EN column for the operator to review
before saving. Never auto-saves: a machine translation of an ingredient list is
a suggestion, not a fact. Worth building only after Phase C exists, since it
needs the same UI to review the output.

## 4. Recommendation

Phases A and B are the actual answer to "the menu doesn't switch" and are a
few hours of work, most of it careful translation. Phase C is what stops the
problem coming back next time the chef changes the carte. Phase D is a
convenience.

Phase A is urgent regardless of the menu question, because of the theme
regression in §1.

---

# Part 3 — Translating the dashboard

Requested after Part 2: the owner/staff dashboard should switch language too,
with the selector living in **Réglages**.

## 1. Size of the job (measured)

| Surface | Files | ~strings |
| --- | --- | --- |
| Owner dashboard (`src/components/dashboard/*`, `src/app/dashboard/**`) | 43 | ~453 |
| Super Admin + login + change-password | 26 | ~214 |
| **Total** | **69** | **~670** |

Worst offenders: `inventory-view` (46), `orders-view` (36), `menu-manager` (23),
`tables-editor` (22), `staff-management` (22), `promotions-manager` (21),
`event-form` (21), `pos-view` (20), `overview-view` (20).

Three shared French label maps also feed these screens and must move to message
keys rather than being duplicated per locale:
`src/lib/events.ts` (`EVENT_CATEGORY_LABELS`, `EVENT_STATUS_LABELS`,
`EVENT_TYPE_LABELS`, `TIME_SLOT_LABELS`), `src/lib/feature-labels.ts`,
`src/lib/permissions.ts` (role labels).

This is ~3× the public-site job and entirely mechanical. It is worth phasing by
how often a screen is actually looked at, not by file size.

## 2. Design decisions

**Where the selector lives.** A "Langue / Language" field in dashboard
**Réglages** (`src/components/dashboard/settings-form.tsx`), reusing the
`LanguageSwitcher` already built for the storefront.

**What it writes.** The same `NEXT_LOCALE` cookie and `setLocale` server action
from Part 1 — no new mechanism, no schema change. One consequence worth stating
plainly: the switch is **per browser and covers both surfaces**, so an owner who
sets the dashboard to English also sees their own storefront in English. For
someone checking how their site looks to an English visitor that is the right
behaviour, not a bug.

**Not per-user.** Storing the preference on `profiles` would follow a person
across devices, but the dashboard runs on shared hardware — the POS terminal,
the kitchen tablet — where "this device is in Arabic because the last person to
log in preferred it" is worse than a per-device setting. Cookie stays.
Revisit only if staff ask for it.

**Kitchen-facing order data stays French.** Order option strings
(`Sans oignons`), stored notes and printed tickets are not translated — same
reasoning as the storefront limitation in Part 1 §6. The kitchen reads one
language; the UI chrome around it is what changes.

## 3. Phasing

Each phase ends green on `npm run typecheck && npm run lint && npm run test`,
and adds its keys to both catalogues (the parity test in
`src/lib/messages.test.ts` enforces that automatically).

**D1 — Shell, navigation, settings (~60 keys).**
`app-sidebar`, `dashboard-header`, `dashboard-toolbar`, `settings-tabs`,
`settings-form` (**including the new language selector**), `empty-state`,
`feature-locked`, `suspended-notice`, `subscription-card`, plus
`src/app/dashboard/**/page.tsx` titles and metadata.
Ships the selector first so everything after it is verifiable by clicking.

**D2 — Daily operations (~150 keys).**
`orders-view`, `kitchen-view`, `kds-view`, `pos-view`, `reservations-view`,
`tables-editor`, `table-picker-modal`, `floor-plan`, `clock-widget`,
`table-turnover`. These are read hourly by staff — the highest-value screens.

**D3 — Management (~200 keys).**
`menu-manager`, `item-form`, `recipe-editor`, `promotions-manager`,
`inventory-view`, `variances-view`, `events-view`, `event-form`,
`customers-view`, `staff-management`, `analytics-view`, `overview-view`,
`hourly-chart`, `labor-panel`, `qr-cards`, `customization-editor`.

**D4 — Shared label maps (~40 keys).**
Convert `EVENT_*_LABELS`, `FEATURE_LABELS` and the role labels from
`Record<K, string>` constants into `Record<K, messageKey>` plus a `t()` lookup
at the call site. Doing this *after* D2/D3 means the call sites already have a
translator in scope.

**D5 — Super Admin + auth (~214 keys).**
`src/app/admin/**`, `src/components/admin/**`, `login`, `change-password`.
Lowest traffic and single-operator, so last — but it is the surface where the
site builder lives, so its English tab labels matter for whoever writes the
translations.

**D6 — Dashboard date/number formatting.**
`formatDateTime` in `src/lib/format.ts` hardcodes `toLocaleString("fr-MA", …)`
and is used by 8 dashboard/admin views; another 8 files import `{ fr }` from
date-fns directly (`reservations-view`, `events-view`, `dashboard-header`,
`clock-widget`, `table-turnover`, `inventory-query`, `orders-view`,
`event-form`). Extend the `dateFnsLocale()` helper from Part 1 §4 across them
and give `formatDateTime` a locale argument.

## 4. Verification

- Extend `e2e/i18n.spec.ts` with an authenticated pass: log in (reusing
  `loginAndClearForcedPasswordChange` from `e2e/rbac.spec.ts`), set the cookie
  to `en`, visit each dashboard route and run the same French-marker sweep.
- The existing message key-parity / placeholder test covers the new namespaces
  for free.

## 5. Recommendation

D1 first and on its own: without the selector in Réglages there is nothing to
demonstrate, and with it every later phase becomes visually verifiable. D2 next
(staff-facing, hourly use). D3–D5 are volume work that can land incrementally
without ever leaving the dashboard in a broken half-state, because any
untranslated screen simply stays French.
