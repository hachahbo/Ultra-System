# Multi-Tenant Mini-Site Template Engine — Implementation Plan (v2)

> v2 replaces the earlier draft plan. Every claim below was re-verified against `main` (HEAD `c84f7c6`, migrations `0001`–`0029`) by reading the actual files. Line references are `file:line` and were accurate at the time of writing.
>
> **Context that changed since v1 was written:** a second real tenant now exists — **Arabesque** (`/arabesque`, slug `arabesque`, id `fa6d1fb6-…`, owner `owner@arabesque.ma`), created via `scripts/seed-arabesque.mjs`. It has a theme row, no menu, and no uploaded images. That makes it the live proof-case for this plan: **everything that still looks like Ô rendez-vous on `/arabesque` is a bug this plan must close.**

---

## 1. Verdict on the v1 plan

**What v1 got right** (verified, keep as-is):

- The architecture really is ~75% there. `restaurant_theme`, `buildThemeCss()`, `getSiteTheme()`, the draft/publish flow, and the SiteBuilder at `/admin/restaurants/[id]/site` are all real and all tenant-scoped.
- `gallery` *is* already a reserved `SectionKey` with no renderer — `src/lib/types.ts:60-69`, confirmed by the comment at `src/app/[slug]/page.tsx:43-48`.
- A Gallery route is genuinely missing.
- The daypart/promo images on About are genuinely hardcoded — `src/app/[slug]/about/page.tsx:173,190`.

**What v1 got wrong** (corrected in this document):

| v1 claim | Reality |
|---|---|
| "3 hardcoded image paths remain, in 2 files" | **19 hardcoded `/images/orendezvous/…` paths across 6 files.** v1 missed `hero-images.tsx` (6), `events-section.tsx` (6), `reservation-form.tsx` (1), `welcome-section.tsx` (1). |
| "Color injection: **no changes needed**" | **317 literal `[#hex]` classes across 13 public-site files**, of which ~130 are Ô rendez-vous's brand orange family (`#cd6133`×56, `#FF6B35`×51, `#DF6C32`, `#f08556`, `#b55026`). The CSS vars are injected correctly — *the components don't consume them.* This is the single biggest gap in the whole template engine and v1 scored it as done. |
| "Events exists but isn't linked in the NavBar" | Events **is** in the NavBar — `src/components/site/nav-bar.tsx:34-40`. |
| "The 6 default pages are Home/Menu/Reservation/About/Contact/Gallery" | There are **7** routes today: `page`, `menu`, `about`, `contact`, `reservation`, `events`, **`gifts`** (v1 never mentions `gifts`). And **Reservation is not in the NavBar** — the nav is menu / gifts / events / about / contact, with reservation reachable only via the "Réserver" CTA. |
| "Update `fr`, `ar` and `en` message files" | There is no `ar.json`. `messages/` holds **fr.json and en.json only**, and `src/lib/messages.test.ts` enforces key parity between exactly those two. |
| Adding a theme column = "migration + types.ts" | Adding a column touches **8 places**. v1 lists 4. Miss any of the other 4 and the field either never reaches the builder or never reaches the public site — see §4. |
| "Create a second test restaurant `test-bistro` to verify" | Already done, better: **`arabesque` is a real tenant** with a real owner login. Verify against it. |

**One thing v1 didn't know it was describing:** the `hasCustomImages` guard at `src/components/site/sections/welcome-section.tsx:24-28` (mirrored at `src/app/[slug]/about/page.tsx:33-46`) requires `images.length >= 4` **and** `every(url => http | /images/about/)`. A tenant that uploads 3 photos, or 5 photos where one is a local non-`/images/about/` path, silently gets the **entire array discarded** and falls back to a set that includes an Ô rendez-vous photo. That is a cross-tenant content bleed disguised as a fallback.

---

## 2. Verified architecture

```
src/app/[slug]/
├── layout.tsx           NavBar + Footer + theme CSS injection      ✅ dynamic
├── page.tsx             hero|specials|welcome|values|testimonials  ✅ dynamic order/enable
├── menu/page.tsx        MenuBrowser                                ✅ dynamic
├── contact/page.tsx     ContactFormSection                         ✅ data dynamic / ⚠️ 63 hex literals
├── reservation/page.tsx feature-gated (features.reservations)      ⚠️ 1 orendezvous image (:42)
├── about/page.tsx       theme copy + gallery                       ⚠️ 4 orendezvous images, 6 hex literals
├── events/page.tsx      feature-gated (features.events)            ⚠️ 6 orendezvous images, 106 hex literals
├── gifts/page.tsx       feature-gated (features.online_ordering)   ✅ clean
└── gallery/             ❌ does not exist
```

`SECTION_KEYS` = `hero, specials, welcome, values, chef, testimonials, gallery` (`src/lib/types.ts:60`). Two are reserved with no renderer: **`chef`** and **`gallery`**. v1 only noticed `gallery`.

**Already dynamic and working** (do not touch): colors→CSS vars via `buildThemeCss()`, 9 font pairs, `logo_url`, `hero_image_urls[]`, `about_title/body`, `specials_image_url`, `welcome_gallery_urls[]`, `about_gallery_urls[]`, socials, `testimonials[]`, `values_items[]`, `about_rating/review_count/map_url`, `custom_copy` (12 keys incl. `about_daypart_*` and `about_promo_*`), and the `i18n` FR→EN override bag (`0023`, `localizeTheme()`).

Note that the daypart and promo cards **already read their heading and body from `custom_copy`** (`about/page.tsx:164,167,200,203`) — only their images are hardcoded. That halves the work v1 scoped for them.

---

## 3. Gap inventory, ranked by what a visitor to `/arabesque` actually sees

### P0 — Another restaurant's brand is visible on every tenant

**P0.1 — Brand-color literals (317 occurrences, 13 files).**
`buildThemeCss()` emits `--primary` etc. scoped to `[data-site-theme]`, and it is correct. But `events-section.tsx` (106), `contact-form.tsx` (63), `reservation-form.tsx` (61), `nav-bar.tsx` (25), `hero-content.tsx` (17) and friends paint `bg-[#cd6133]`, `text-[#FF6B35]`, `bg-[#1a1715]` directly. **An operator can set Arabesque's primary to teal and the site stays orange.** Nothing else in this plan matters more.

**P0.2 — Demo-photo bleed (19 paths, 6 files).**

| File | Lines | What breaks |
|---|---|---|
| `src/components/site/hero-images.tsx` | 33,34,37,38,41,42 | A tenant with 0 hero images gets **Ô rendez-vous's homepage hero**. This is exactly why `scripts/seed-arabesque.mjs` now interleaves `/images/arabesque/hero-main.jpg` with `hero-pop-default.webp` — a workaround for this bug, not a fix. |
| `src/app/[slug]/about/page.tsx` | 50,52,173,190 | `galleryImages[3]` and `bentoCardImage` are *unconditional overrides* — they overwrite theme data that was correctly fetched two lines earlier. |
| `src/components/site/sections/events-section.tsx` | 76,100-103,218 | Fallback cover + 4 "past events" photos + 1 inline. |
| `src/components/site/reservation-form.tsx` | 241 | Internal fallback behind the `featureImage` prop. |
| `src/components/site/sections/welcome-section.tsx` | 9 | 4th default welcome image. |
| `src/app/[slug]/reservation/page.tsx` | 42 | Prop passed as a literal. |

**P0.3 — The all-or-nothing gallery guard.** `welcome-section.tsx:24-28` and `about/page.tsx:33-46`. Partial uploads are discarded wholesale in favour of demo content.

### P1 — Missing surface

- **P1.1** No `/{slug}/gallery` route, no `gallery_image_urls` column, no builder panel.
- **P1.2** NavBar is not feature-aware: `nav-bar.tsx` receives `slug/name/logoUrl` only (`layout.tsx:88`), so `events` and `gifts` links render even when the feature is off — the visitor clicks through to a `FeatureUnavailable` screen. The data is already available in `layout.tsx`.
- **P1.3** Reservation has no nav entry despite being one of the "6 default pages".

### P2 — Plumbing

- **P2.1** New theme columns must be threaded through 8 call sites (§4).
- **P2.2** The asset uploader's `KINDS` allow-list (`.../theme/assets/route.ts:7`) and the client `AssetKind` union (`panel-images.tsx:18`) must both learn `"gallery"`, or every gallery upload 400s.

---

## 4. The 8-point checklist for adding a `restaurant_theme` column

This is the part v1 was missing, and it is the part that actually costs a debugging cycle (see the comment at `src/lib/menu.ts:168-179`, written after a missing `i18n` column silently stripped an entire theme).

| # | File | What to add |
|---|---|---|
| 1 | `supabase/migrations/0030_gallery_page.sql` | the `alter table` — **check `ls supabase/migrations/` first; 0029 is taken** |
| 2 | `src/lib/types.ts:98` | field on `RestaurantTheme` (`ThemeDraftFields` / `ResolvedTheme` derive from it automatically) |
| 3 | `src/lib/theme.ts:23` | entry in `DEFAULT_THEME` |
| 4 | `src/lib/schemas.ts:475` | entry in `themeDraftSchema`, reusing the existing `assetUrl` refinement (`schemas.ts:444`) |
| 5 | `src/app/api/admin/restaurants/[id]/theme/route.ts:8` | add to the `THEME_COLUMNS` string — **omit this and the SiteBuilder never loads the field** |
| 6 | `src/lib/menu.ts:163` | add to the `getPublicThemeRow` select list — **omit this and the public site never renders it** |
| 7 | `src/components/admin/site-builder/site-builder.tsx:41` | add to `themeToFormValues()` |
| 8 | `src/components/admin/site-builder/panel-images.tsx` | the editor UI |

The publish route (`.../theme/publish/route.ts`) needs **no** change: its `merged` base only carries the original 0005 fields and the validated draft is spread over it, so any newer column is simply written from the draft when present and left untouched when absent.

---

## 5. Decisions (v1's open questions, resolved)

**Q1 — Gallery layout.** Flat responsive masonry via CSS `columns`, no categories. Categories need a per-image metadata shape (`{url, category}`), which breaks the `text[]` convention every other gallery column uses and needs a whole builder sub-editor. Ship flat; revisit if an operator asks.

**Q2 — Nav.** Keep Events. Make the nav **feature-aware** instead (P1.2) and add **Gallery** and **Reservation**. Final nav: Menu · Gallery · Events\* · Gifts\* · Reservation · About · Contact (\* = rendered only when the feature is enabled). Gallery renders only when `gallery_image_urls.length > 0`, so an empty tenant never shows a dead link.

**Q3 — About daypart/promo images.** **Option A** — two dedicated columns `about_daypart_image_url` / `about_promo_image_url`. Option B (index into `about_gallery_urls`) makes reordering the gallery silently reshuffle two unrelated cards, and their *copy* already lives in dedicated `custom_copy` keys, so dedicated image columns match the established shape.

**Q4 — Reservation image.** `theme.hero_image_urls[0]` — no new column. The reservation feature panel is decorative; reusing hero 0 means it is correct for every tenant the moment they upload a hero, with zero extra builder surface. Same treatment for the `reservation-form.tsx:241` internal fallback: drop it, render nothing when the prop is absent.

**New decision — fallback philosophy.** For every fix below: **render nothing rather than render someone else's photo.** This is already the stated rule for the 0019 columns (`types.ts:112-114`: *"never as 'fall back to another restaurant's demo content'"*) — it just wasn't applied to hero, welcome, about or events. Neutral local assets under `/images/about/*` and `/images/hero-default.webp` are acceptable as generic placeholders; anything under `/images/orendezvous/` is not.

---

## 6. Phases

### Phase 0 — De-brand the color system *(new; largest, highest value)*

Replace literal hexes with the tokens `buildThemeCss()` already emits. Mechanical, file by file, highest-count first.

| File | Hexes | Mapping |
|---|---|---|
| `sections/events-section.tsx` | 106 | orange family → `primary`; `#1a1715`/`#1c1712`/`#262320` → `card`/`muted`; `#a8a29e`/`#78716c` → `muted-foreground` |
| `sections/contact-form.tsx` | 63 | same |
| `reservation-form.tsx` | 61 | same |
| `nav-bar.tsx` | 25 | same |
| `hero-content.tsx` | 17 | same |
| remaining 8 files | 45 | same |

Rules: `#cd6133 / #FF6B35 / #DF6C32 / #f08556 / #b55026` → `bg-primary` / `text-primary` / `border-primary` (+ `/90`, `/10` opacity modifiers instead of the hand-picked tints). Neutrals → `background` / `card` / `muted` / `foreground` / `muted-foreground` / `border`. Keep literals only for genuinely non-brand values (pure-black overlays, shadow rgba).

Do this **first**: it is independent of the schema work, needs no migration, and it is what makes `/arabesque` stop looking like `/orendezvous`.

**Checkpoint:** `grep -rno "\[#[0-9a-fA-F]\{3,8\}\]" src/components/site src/app/\[slug\]` should drop from 317 to under ~30 (overlays only), and setting `color_primary` in the SiteBuilder must visibly change the nav, buttons, events cards and reservation form.

### Phase 1 — Schema (`0030_gallery_page.sql`)

```sql
-- verify the next free number first: ls supabase/migrations/
alter table public.restaurant_theme
  add column gallery_image_urls      text[] not null default '{}',
  add column about_daypart_image_url text,
  add column about_promo_image_url   text;

notify pgrst, 'reload schema';  -- same reason as 0005:60-62
```

Then checklist items 2–7 from §4.

### Phase 2 — Kill the demo-photo bleed (19 paths)

- `hero-images.tsx:33-42` — drop all 6 orendezvous defaults. Render the hero collage only for indices the tenant actually supplied; if `images` is empty, fall back to `/images/hero-default.webp` for the main slot and render nothing in the pop slots. *(Once this lands, simplify `scripts/seed-arabesque.mjs` back to Arabesque's own images only — the interleaved `hero-pop-default.webp` entries exist purely to dodge this bug.)*
- `about/page.tsx:48-52` — delete the `galleryImages[3]` override and the `bentoCardImage` literal; take `bentoCardImage` from `welcome_gallery_urls[0] ?? about_gallery_urls[0] ?? "/images/about/about-2.webp"`.
- `about/page.tsx:173,190` — `theme.about_daypart_image_url` / `theme.about_promo_image_url`, each with an `/images/about/*` fallback.
- `about/page.tsx:33-46` + `welcome-section.tsx:24-28` — replace the `>= 4 && every(...)` guard with per-slot resolution: use `images[i]` when present, neutral default otherwise. Delete the `/images/about/` prefix test (it rejects legitimate operator uploads stored anywhere else).
- `welcome-section.tsx:9` — swap the orendezvous entry for `/images/about/about-4.webp`.
- `reservation/page.tsx:42` — `featureImage={theme.hero_image_urls[0]}`.
- `reservation-form.tsx:241` — drop the literal fallback; render the panel only when `featureImage` is set.
- `events-section.tsx:76,100-103,218` — `FALLBACK_IMAGE` → `/images/hero-default.webp`; `PAST_PHOTOS` → `theme.about_gallery_urls` (empty ⇒ hide the "past events" strip); `:218` → theme-driven or removed.

**Checkpoint:** `grep -rn "images/orendezvous" src/` returns nothing but `dashboard-header.tsx:477` (a default *slug*, not an image — leave it, or better, make it fall back to the profile's own slug).

### Phase 3 — Gallery page

- `src/app/[slug]/gallery/page.tsx` — async RSC, `getRestaurantBySlug` → `notFound()` → `getSiteTheme`, `generateMetadata` via `getTranslations("Gallery")`, matching the other 7 routes.
- `src/components/site/gallery-grid.tsx` — CSS `columns` masonry, `next/image` with `sizes`, hover scale; empty state renders a friendly placeholder, never a 404.
- Optional (cheap, do it while here): register a `gallery` renderer in `src/app/[slug]/page.tsx:49` so the reserved `SectionKey` finally does something on the homepage too.
- Messages: add a `Gallery.*` block to **`messages/fr.json` and `messages/en.json`** — both, or `src/lib/messages.test.ts` fails on key parity.

### Phase 4 — NavBar

- `nav-bar.tsx:34` — add `{ href: "/gallery", key: "gallery", icon: Images }` and `{ href: "/reservation", key: "reserve", icon: CalendarCheck }` (the `Nav.reserve` key already exists in both catalogs).
- Add `Nav.gallery` to fr + en.
- Pass the already-computed `features` and a `hasGallery` boolean from `layout.tsx:88` into `NavBar`, and filter `links` on them (P1.2/Q2).

### Phase 5 — SiteBuilder

- `panel-images.tsx` — a "Galerie" `ImageListField` for `gallery_image_urls` (the component at `:36` already does add/remove/reorder — reuse it, don't rewrite), plus two single-image pickers modelled on the existing `specials_image_url` handler at `:180`.
- `panel-images.tsx:18` — extend `AssetKind` with `"gallery"`.
- `.../theme/assets/route.ts:7` — add `"gallery"` to `KINDS`.
- Schema entry (§4 item 4):
  ```ts
  gallery_image_urls: z.array(assetUrl).max(30).optional(),
  about_daypart_image_url: assetUrl.nullable().optional(),
  about_promo_image_url: assetUrl.nullable().optional(),
  ```
  `assetUrl`, not `z.string().url()` as v1 proposed — v1's version rejects the `/`-relative paths this codebase stores everywhere. `.max(30)` because a gallery is the one field where 15 (the hero cap) is genuinely tight.

### Phase 6 — Defaults & i18n polish

- `DEFAULT_THEME` (§4 item 3): `gallery_image_urls: []`, both new URLs `null`.
- No `localizeTheme` change needed — image URLs are deliberately never translated (`i18n-content.ts:106`, same rule as `values_items.image_url`).

---

## 7. Verification

```bash
npx tsc --noEmit
npm run lint
npm test                     # messages parity + i18n-content suites will catch missing keys
npx playwright test e2e/i18n.spec.ts e2e/accessibility.spec.ts
```

Manual, against the two real tenants:

1. **`/arabesque`** — all 8 pages load; **zero** Ô rendez-vous photos anywhere; nav hides features the tenant doesn't have; Gallery either shows Arabesque's images or a clean empty state.
2. **SiteBuilder → Arabesque** — set `color_primary` to something unmistakable (e.g. `#0f766e`) and confirm the nav, buttons, events cards, contact form and reservation panel all change. *This is the acceptance test for Phase 0 and it fails today.*
3. Upload **3** gallery images (deliberately under the old `>= 4` threshold) and confirm all 3 render — no silent fallback.
4. Save a draft → preview cookie path → publish → confirm the 409 optimistic-concurrency guard still behaves (`theme/route.ts:70-76`).
5. **`/orendezvous`** — pixel-compare against production. Its theme row already carries its own hero/gallery URLs, so removing the hardcoded fallbacks must be a no-op for it. Any visible change there means a theme column wasn't populated where a literal used to cover for it.

---

## 8. Effort

| Phase | Files | Complexity | Notes |
|---|---|---|---|
| 0 — de-brand colors | 13 | **High** (volume, not difficulty) | ~317 replacements; the real cost of this plan |
| 1 — schema + 6 plumbing sites | 7 | Low | mechanical, but all 8 checklist points or it silently no-ops |
| 2 — demo-photo bleed | 6 | Medium | 19 paths + 2 fallback-guard rewrites |
| 3 — Gallery page | 2 new + 2 messages | Medium | |
| 4 — NavBar | 1 + layout + 2 messages | Low | includes feature-awareness |
| 5 — SiteBuilder + upload kind | 3 | Medium | `ImageListField` is reusable |
| 6 — defaults | 1 | Trivial | |

**~25 files. 2.5–3 focused days** — not the ~11 files / 1 day v1 estimated, and the difference is almost entirely Phase 0, which v1 marked "no changes needed."

**Suggested order:** Phase 0 alone, committed and verified on `/arabesque` first (independent, no migration, biggest visible win) → then 1→2→3→4→5→6 as one schema-flavoured batch.
