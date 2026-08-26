---
name: emd-design-system
description: Apply the EMD Organization dark design system to the Nuxt/Vue app — token palette, typography, the app sidebar shell, and all five Settings tabs (Profile, Preferences, Security, Notifications, Team Members). Use when restyling Settings, building a new Settings tab, touching the sidebar or app shell, or when asked to make a screen "match the design system" / "match the mockup".
---

# EMD Design System

You are applying a defined visual system to an existing Nuxt 3 + Vue 3 application.
The ground truth is `assets/settings-profile-mockup.html` in this skill directory —
**open it and read it before writing any code.** It is a complete, working reference
implementation of the Profile tab. Every spacing value, border treatment, and
component pattern you need is in there.

## Scope of this skill

| Area | Change it? |
|---|---|
| App sidebar / shell / layout | **Yes** — app-wide, every screen shares it |
| Settings: Profile, Preferences, Security, Notifications, Team Members | **Yes** — full restyle |
| Global token + font files | **Yes** — these are the foundation |
| Tags, Units, Relations, Org Chart, Users, and all other feature screens | **No** — leave alone this run |

If a shared component (a Button, Badge, Card) is used by both Settings and a
feature screen, you may restyle it — that is intended — but do not go restructure
the feature screens themselves.

---

## The five non-negotiable rules

These are why the original screen looked off. Violating any of them undoes the work.

### 1. Accent budget: orange appears at most 4 times per screen

`--accent` (orange) is permitted **only** for:

1. The single primary action button on the page
2. The active-location marker in navigation (a 2px bar, nothing else)
3. Progress / meter fill
4. The focus ring

It is **forbidden** on: card icons, section headings, secondary links, "Edit"
affordances, ID badges, decorative dots, avatar borders, and card header glows.
Those all use `--text-muted`, `--text-subtle`, or a neutral surface chip.

Before you finish a screen, count the orange elements. If it is more than 4,
you have made the same mistake the original had.

### 2. Surfaces are true neutral, never warm-tinted

The old app used brown-tinted surfaces. That is what killed the accent — orange
cannot pop against warm grey. Every surface comes from the neutral ramp in
`references/tokens.css`. No `rgba(249,115,22, …)` backgrounds on cards, no radial
orange gradients behind card headers. Delete every one you find.

### 3. Contrast floors are hard requirements

- Body and label text: **4.5:1** minimum against its own surface
- Interactive boundaries (button borders, input borders, dashed add-buttons): **3:1**
- This is why there are two border tokens. `--border` is decorative separation
  only. `--border-ctrl` is for anything the user can click. Do not use `--border`
  on a control.

The token values in `references/tokens.css` are already measured and passing.
Use them as given. If you invent a new colour, verify it before shipping.

### 4. Elevation is borders, not shadows

Shadows are near-invisible on a `#0B0B0C` background. Every card, panel and
popover is separated by a `1px solid var(--border)` and a surface-level change.
The only shadows in the system are on genuinely floating elements (dropdown
menus, toasts, modals) and they exist to darken, not to lift.

### 5. Every empty value is an action, never a dash

`—`, `N/A`, `Not specified` are banned. An empty field renders as a dashed-border
button reading `+ Add <field name>`, flagged `Required` in `--warning` when it is.
An empty list renders as a centred empty state with an icon, one sentence, and a
button. See `references/components.md` → Empty states.

---

## Typography

Two families, loaded self-hosted via `@nuxt/fonts` or `nuxt-google-fonts`:

- **Inter** — all UI text. Weights 400, 500, 600, 700.
- **JetBrains Mono** — identifiers only: employee IDs, tax IDs, API tokens,
  postal codes, IP addresses, hashes, timestamps in tables. Weights 400, 500.

Never use mono for prose. Never use Inter for an ID.

The scale — six sizes, no others:

| Token | Size / line-height | Weight | Used for |
|---|---|---|---|
| `--t-display` | 22px / 1.25 | 600 | Page title (`My Profile`) |
| `--t-title` | 20px / 1.3 | 600 | Entity name in a hero card |
| `--t-heading` | 13.5px / 1.4 | 600 | Card headings |
| `--t-body` | 14px / 1.5 | 400–500 | Field values, body copy |
| `--t-small` | 12–13px / 1.5 | 400–500 | Secondary text, table cells, buttons |
| `--t-label` | 11px / 1.4 | 600 | UPPERCASE field labels, `.06em` tracking |

Display and title get `letter-spacing: -0.02em`. Labels get `+0.06em` and
`text-transform: uppercase`. Nothing else gets tracking.

---

## Workflow

Work in this order. Do not skip the audit — you need to know what you are changing.

### Step 0 — Audit

Report before editing:

- Is `@nuxtjs/tailwindcss` in `nuxt.config.ts`? This decides the token strategy below.
- Where are global styles? (`assets/css/`, `app.vue` `<style>`, a Nuxt UI theme file)
- Where is the sidebar/shell? (usually `layouts/default.vue` + `components/AppSidebar.vue`)
- Where do the Settings pages live? (`pages/settings/*.vue` or a single page with tabs)
- Is a component library present — Nuxt UI, PrimeVue, Vuetify, shadcn-vue?
- Grep for hardcoded colours: `#F97316`, `#FF6B1A`, `orange`, `amber`, `rgba(249`.
  List every file. These are what you will be replacing.

State what you found, then proceed.

### Step 1 — Install tokens

Copy `references/tokens.css` to `assets/css/tokens.css` and register it:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  css: ['~/assets/css/tokens.css'],
})
```

**If Tailwind is present**, additionally map the tokens into
`tailwind.config.ts` so utilities resolve to variables — never to raw hex:

```ts
theme: {
  extend: {
    colors: {
      bg: 'var(--bg)',
      surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)', 3: 'var(--surface-3)' },
      line: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)', ctrl: 'var(--border-ctrl)' },
      ink: { DEFAULT: 'var(--text)', muted: 'var(--text-muted)', subtle: 'var(--text-subtle)' },
      accent: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)', subtle: 'var(--accent-subtle)' },
      success: 'var(--success)', warning: 'var(--warning)',
      danger: 'var(--danger)', info: 'var(--info)',
    },
    borderRadius: { sm: '6px', md: '12px', pill: '999px' },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
  }
}
```

Then delete Tailwind's default palette usages (`bg-zinc-900`, `text-gray-400`,
`border-neutral-800`) from the files you touch. Semantic names only.

**If Tailwind is absent**, use the CSS variables directly in `<style scoped>`
blocks. Same tokens, same names.

Either way: **no hex literal may remain in a component file.** Every colour is
`var(--…)` or a Tailwind utility that resolves to one.

### Step 2 — Build the primitives

Create or restyle these in `components/ui/`, following
`references/components.md` exactly:

`UiButton` · `UiCard` · `UiBadge` · `UiField` · `UiEmptyState` · `UiToggle` ·
`UiSelect` · `UiInput` · `UiTable` · `UiSecretValue` · `UiSettingRow`

Build these before the pages. Every page below is assembled from them; if you
inline the styles per page you will drift and the tabs will not match.

### Step 3 — Sidebar and shell (app-wide)

Restyle `layouts/default.vue` and the sidebar component to match the mockup.
Full spec in `references/components.md` → App shell. Key points:

- Grid: `248px` org sidebar · `188px` settings sub-nav · `1fr` content.
  The sub-nav is **188px, not 215px** — the original wasted horizontal space.
- Nav items are `--text-muted` at 13px with 15px icons at 0.75 opacity.
  Active item: `--surface-2` background, `--text` colour, weight 500, plus a
  2px `--accent` bar at its left edge. That bar is the whole accent treatment —
  the icon and label stay neutral.
- Sticky 56px topbar with a `Settings / Profile` breadcrumb. **Remove the
  duplicate titles** — the original said "Profile" in the topbar, "My Profile"
  as the page title, and "My Profile" in the sub-nav. Breadcrumb + page title only.
- Sidebar footer: avatar, name, role, sign-out icon button, separated by a top border.

This is the one part of this skill that affects screens outside Settings. That
is intentional and expected — do not scope it to Settings only.

### Step 4 — The five tabs

Full per-tab specifications are in `references/tabs.md`. Read that file before
each tab. Build them in this order, since each reuses primitives from the last:

1. **Profile** — port the mockup 1:1. It is already built; match it exactly.
2. **Preferences** — setting rows, toggles, selects, theme switcher
3. **Notifications** — the channel matrix
4. **Security** — sessions table, 2FA, API tokens, danger zone
5. **Team Members** — data table, filters, invite flow

Every tab shares: the same page header (title + one-line description + one
primary action), the same card grid, the same field/label treatment.

### Step 5 — Verify

Run the checklist in `references/checklist.md` and report the result. Do not
declare a tab done until it passes. The accent count and the contrast check are
the two that matter most.

---

## Things that will trip you up

- **Light mode.** The token file ships both themes. If the app has a theme
  toggle, wire it to `[data-theme]` on `<html>`. Note that `--accent` as *text*
  is a different value in light mode (`#C2410C`) than the fill colour — orange
  at 2.8:1 on white is unreadable. The token file handles this with
  `--accent-text`; use that token for orange text, never `--accent`.
- **Card heights.** Use `align-items: start` on the grid, not `stretch`. Cards
  should size to their content; the columns stay balanced because the content is
  balanced, not because you forced equal heights.
- **Don't invent new spacing.** Everything is a multiple of 4px. Card padding is
  18px body / 14px 18px header. Grid gap is 20px. Page padding is 28px 32px.
- **Focus rings are not optional.** `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`. This is one of the four sanctioned accent uses and the most important one.
- **Sensitive values are masked by default.** Tax IDs, API tokens, and any
  government identifier render as `••••` with a reveal toggle. Use `UiSecretValue`.