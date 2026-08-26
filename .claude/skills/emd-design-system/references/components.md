# Component specifications

Every measurement here is taken from `assets/settings-profile-mockup.html`.
When this file and the mockup disagree, the mockup wins — open it and read the CSS.

All components live in `components/ui/` as Vue SFCs with `<script setup lang="ts">`.

---

## App shell

```
┌──────────┬────────┬──────────────────────────────────┐
│ 248px    │ 188px  │ 1fr                              │
│ org nav  │ subnav │ topbar 56px (sticky)             │
│          │        ├──────────────────────────────────┤
│          │        │ page: 28px 32px, max-width 1240px │
└──────────┴────────┴──────────────────────────────────┘
```

```css
.app { display: grid; grid-template-columns: var(--sidebar-w) var(--subnav-w) minmax(0,1fr); height: 100vh; }
```

Both sidebars: `background: var(--bg)`, `border-right: 1px solid var(--border)`.
Content column: `overflow-y: auto; min-width: 0`.

### Org card (sidebar top)

`margin: 12px; padding: 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md)`.
32px square mark at `--r-sm`, `background: var(--accent-subtle)`, `border: 1px solid var(--accent-border)`, icon in `--accent`.
This is the only place the org mark carries accent, and it is branding rather than
an interactive accent — it does not count against the 4-use budget.
Name: 13px/600. Sub-line: 11px `--text-subtle`, truncated with ellipsis.

### Search trigger

Full-width button, `padding: 7px 10px`, `background: var(--surface)`,
`border: 1px solid var(--border-ctrl)`, `--r-sm`, `--text-subtle` at 13px.
Trailing `<kbd>⌘K</kbd>`: 10px mono, `--surface-3`, `1px solid var(--border-strong)`, 4px radius.

### Nav items

```css
.nav a {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 10px; border-radius: var(--r-sm);
  color: var(--text-muted); font-size: 13px; position: relative;
}
.nav a:hover { background: var(--surface-2); color: var(--text); }
.nav a svg { width: 15px; height: 15px; opacity: .75; flex: none; }

/* active — sanctioned accent use #2 */
.nav a.is-active { background: var(--surface-2); color: var(--text); font-weight: 500; }
.nav a.is-active svg { opacity: 1; }
.nav a.is-active::before {
  content: ""; position: absolute; left: 0; width: 2px; height: 16px;
  background: var(--accent); border-radius: 0 2px 2px 0;
}
```

Section label above a nav group: 10px/600, `.09em` tracking, uppercase, `--text-subtle`, `padding: 0 22px 8px`.

**Icons: stroke only.** `fill="none" stroke="currentColor" stroke-width="1.8"`,
24-unit viewBox. Never filled, never two-tone, never coloured.

### Sidebar footer

`margin-top: auto; padding: 12px; border-top: 1px solid var(--border)`.
28px pill avatar (`--surface-3`, `1px solid var(--border-strong)`, 11px/600 initials in `--text-muted`),
name 12.5px/500, role 11px `--text-subtle`, sign-out icon button pushed right.

### Topbar

56px, `position: sticky; top: 0; z-index: 5`, `border-bottom: 1px solid var(--border)`,
`background: color-mix(in srgb, var(--bg) 88%, transparent)` + `backdrop-filter: blur(8px)`,
`padding: 0 32px`.

Contains: sidebar-collapse icon button · breadcrumb · overflow menu (right).
Breadcrumb is 13px `--text-subtle` with the current page in `--text` at weight 500.
**No page title here** — that belongs to the page header below.

### Icon button

30px square, `--r-sm`, `--text-subtle`. Hover: `background: var(--surface-2); color: var(--text)`.
16px icon. Always carries an `aria-label`.

---

## Page header

Every Settings tab opens with the same block:

```
┌─────────────────────────────────────────────────────┐
│ My Profile                        [ Export ] [ CTA ]│
│ One-line description of the tab.                    │
└─────────────────────────────────────────────────────┘
```

Title `var(--t-display)` with `letter-spacing: var(--track-tight)`.
Description 13px `--text-subtle`, `margin-top: 2px`.
Actions right-aligned, `gap: 8px`, `align-items: flex-end` on the row, `margin-bottom: 20px`.

**Exactly one primary button per page.** Everything else is `.btn-ghost`.

---

## UiButton

```css
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  height: var(--h-btn); padding: 0 14px;
  border-radius: var(--r-sm); border: 1px solid transparent;
  font-size: 13px; font-weight: 500; white-space: nowrap;
  transition: background var(--dur-fast), border-color var(--dur-fast);
}
.btn svg { width: 14px; height: 14px; }
.btn:disabled { opacity: .45; pointer-events: none; }

/* sanctioned accent use #1 — one per page */
.btn-primary { background: var(--accent); color: var(--on-accent); font-weight: 600; }
.btn-primary:hover  { background: var(--accent-hover); }
.btn-primary:active { background: var(--accent-press); }

.btn-ghost { color: var(--text-muted); border-color: var(--border-ctrl); }
.btn-ghost:hover { background: var(--surface-2); color: var(--text); border-color: var(--text-subtle); }

.btn-danger { background: var(--danger-bg); color: var(--danger); border-color: var(--danger); }
.btn-danger:hover { background: var(--danger); color: #fff; }

.btn-sm { height: var(--h-btn-sm); padding: 0 10px; font-size: 12px; }

/* the per-card "Edit" affordance — text only, no border, NOT orange */
.btn-link { color: var(--text-muted); font-size: 12px; font-weight: 500; padding: 4px 6px; border-radius: var(--r-sm); }
.btn-link:hover { color: var(--text); background: var(--surface-2); }
```

Props: `variant: 'primary' | 'ghost' | 'danger' | 'link'`, `size: 'md' | 'sm'`, `loading`, `disabled`, `icon`.

Loading state: swap the icon for a spinner, keep the label, set `pointer-events: none`. Never change the button's width.

---

## UiCard

```css
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; }
.card-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px; border-bottom: 1px solid var(--border);
}
.card-body { padding: var(--card-pad); }
```

**Card header icon chip — neutral, this is where the old design went wrong:**

```css
.card-ico {
  width: 26px; height: 26px; flex: none; border-radius: var(--r-sm);
  background: var(--surface-3); border: 1px solid var(--border-strong);
  display: grid; place-items: center; color: var(--text-muted);
}
.card-ico svg { width: 14px; height: 14px; }
```

No orange. No radial gradient behind the header. If you find
`background: radial-gradient(… rgba(249,115,22 …))` anywhere, delete it.

Heading `var(--t-heading)`. The `Edit` action goes at `margin-left: auto` as
`.btn-link`. **Every card gets one** — the old screen had it on two of four
cards plus a global button, which left the edit model ambiguous.

Slots: `#icon`, `#title`, `#action`, default (body).

### Card grid

```css
.grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: var(--grid-gap); align-items: start; }
```

`align-items: start`, never `stretch`. Collapse to one column under 1180px.
Order cards so the two columns end at roughly the same height — that is a
content decision, not a CSS one.

---

## UiField

The label/value pair. This is the most-repeated element in Settings.

```css
.fields { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px 20px; }
.fields .full { grid-column: 1 / -1; }

.f-label {
  display: block; font: var(--t-label);
  letter-spacing: var(--track-label); text-transform: uppercase;
  color: var(--text-subtle); margin-bottom: 4px;
}
.f-value { font-size: 14px; font-weight: 500; color: var(--text); word-break: break-word; }
.f-value.muted { color: var(--text-muted); font-weight: 400; }
.f-value.mono  { font-family: var(--font-mono); font-size: 13px; letter-spacing: -0.01em; }
```

Props: `label`, `value`, `span: 1 | 2`, `mono`, `muted`, `copyable`, `secret`.

Long-form values (a bio, an address line) use `.full` and `.muted`.

---

## UiSecretValue

Masks sensitive data. Use for tax IDs, government IDs, API tokens, and any
identifier that should not be readable over someone's shoulder.

```
•••••••••  [👁]        ← default
AS4645756  [👁]        ← after reveal
```

- Masked text is `••` repeated to roughly the real length, in `--font-mono`
- Reveal button is a `.mini` (24px, 5px radius, `--text-subtle`, hover
  `--surface-3` + `--border-ctrl`)
- Reveal is per-instance and resets on route change — never persist it
- Emit `reveal` so the app can audit-log it if needed

Non-secret identifiers (employee ID, postal code) use the same mono treatment
plus a **copy** button instead of reveal. On copy: swap the icon to a check in
`--success` for 1.4s, then restore. **Both get the same visual treatment** — do
not make one an orange pill and the other plain text.

---

## UiBadge

```css
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  height: 20px; padding: 0 8px; border-radius: var(--r-pill);
  font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
}
.badge .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.badge.ok      { background: var(--success-bg); color: var(--success); }
.badge.warn    { background: var(--warning-bg); color: var(--warning); }
.badge.danger  { background: var(--danger-bg);  color: var(--danger); }
.badge.info    { background: var(--info-bg);    color: var(--info); }
.badge.neutral { background: var(--surface-3);  color: var(--text-muted); }
```

Status → variant map: Active/Verified/Enabled → `ok` · Pending/Expiring → `warn` ·
Suspended/Revoked/Failed → `danger` · Invited/Draft → `info` · Inactive/Archived → `neutral`.

Badges are **never** orange. Status is not an accent.

---

## UiEmptyState

Two forms.

**Inline (a missing field):**

```css
.empty {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 12px 14px; border-radius: var(--r-sm);
  border: 1px dashed var(--border-ctrl); background: transparent;
  color: var(--text-muted); font-size: 13px; text-align: left;
}
.empty:hover { border-color: var(--accent-border); background: var(--accent-subtle); color: var(--text); }
.empty .plus { width: 22px; height: 22px; border-radius: 5px; background: var(--surface-3); display: grid; place-items: center; }
.empty:hover .plus { color: var(--accent); }
.empty small { margin-left: auto; font-size: 11px; color: var(--warning); }  /* "Required" */
```

Label reads `Add <field name>` — never `—`, never `N/A`, never `Not specified`.

**Block (an empty list or table):**

Centred in the card body, `padding: 48px 24px`. 40px neutral icon chip
(`--surface-3`, `--r-md`), then a 14px/600 headline, then one sentence of
13px `--text-subtle` at `max-width: 320px`, then a single button. That button
may be primary only if the page has no other primary action.

---

## UiSettingRow

The workhorse of Preferences, Security and Notifications: a labelled setting
with a control on the right.

```css
.set-row {
  display: flex; align-items: center; gap: 20px;
  padding: 14px 0; min-height: var(--h-row);
}
.set-row + .set-row { border-top: 1px solid var(--border); }
.set-row .txt { min-width: 0; flex: 1; }
.set-row .txt b { display: block; font-size: 13.5px; font-weight: 500; color: var(--text); }
.set-row .txt span { display: block; font-size: 12px; color: var(--text-subtle); margin-top: 2px; }
.set-row .ctl { flex: none; }
```

Rows are separated by a border, never by a background change. The control column
should be a consistent width down a card so the controls align vertically.

---

## UiToggle

38 × 22px track, `--r-pill`.

- Off: `background: var(--surface-3)`, `border: 1px solid var(--border-ctrl)`
- On: `background: var(--accent)`, no border
- Knob: 16px circle, `#fff`, 3px inset, `transition: transform var(--dur) var(--ease)`
- Disabled: `opacity: .45`

The "on" fill is the one accent use permitted inside a card body, because it
carries state rather than decoration. A card full of toggles is fine — that is a
single repeated control, not fourteen scattered accents.

Always pair with a real `<input type="checkbox" class="sr-only">` for accessibility.

---

## UiInput / UiSelect

```css
.input {
  height: var(--h-input); width: 100%; padding: 0 11px;
  background: var(--surface-2); color: var(--text);
  border: 1px solid var(--border-ctrl); border-radius: var(--r-sm);
  font-size: 13.5px;
}
.input::placeholder { color: var(--text-subtle); }
.input:hover  { border-color: var(--text-subtle); }
.input:focus  { outline: 2px solid var(--accent); outline-offset: 1px; border-color: transparent; }
.input.error  { border-color: var(--danger); }
.input:disabled { opacity: .5; cursor: not-allowed; }
```

Error message below: 11.5px `--danger`, `margin-top: 4px`.
Helper text below: 11.5px `--text-subtle`.
Select adds a 14px chevron in `--text-subtle` at `right: 10px`, `pointer-events: none`.

**Segmented control** (theme switcher, density): a `--surface-2` container with
3px padding and `--r-sm`; the selected segment gets `--surface` background,
`1px solid var(--border-strong)`, and `--text` colour. The selected segment is
**not** orange — this is a neutral selection, not a primary action.

---

## UiTable

For Active Sessions, API Tokens, and Team Members.

```css
.tbl { width: 100%; border-collapse: collapse; }
.tbl th {
  text-align: left; font: var(--t-label);
  letter-spacing: var(--track-label); text-transform: uppercase;
  color: var(--text-subtle); padding: 10px 14px;
  border-bottom: 1px solid var(--border); white-space: nowrap;
}
.tbl td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
.tbl tbody tr:last-child td { border-bottom: 0; }
.tbl tbody tr:hover { background: var(--surface-2); }
```

- The table sits inside a `UiCard` with `card-body` padding removed
  (`padding: 0`), so rows run edge to edge.
- Mono for IDs, IPs, and timestamps. Sentence case for everything else.
- The row-actions column is `width: 1%; text-align: right` holding a `⋯` icon button.
- Sortable headers get a 12px chevron that appears on hover, solid when active.
- Below 900px the table becomes a stack of cards — one card per row, labels
  inline. Never let a table scroll the page body horizontally; if it must
  scroll, wrap it in `overflow-x: auto`.

---

## Dialogs, dropdowns, toasts

The only three places shadows are allowed.

- **Dialog**: `--surface`, `--r-md`, `1px solid var(--border)`, `--shadow-modal`,
  `max-width: 480px`, scrim `--scrim` with `backdrop-filter: blur(2px)`.
  Header 18px/600 + 13px `--text-subtle` description; footer right-aligned with
  ghost cancel + one primary confirm.
- **Dropdown**: `--surface-2`, `--r-sm`, `1px solid var(--border-strong)`,
  `--shadow-pop`, 4px padding, items 32px tall at 13px, hover `--surface-3`,
  destructive items in `--danger`.
- **Toast**: bottom-right, `--surface-2`, `1px solid var(--border-strong)`,
  `--r-sm`, `--shadow-pop`, with a 3px left bar in the semantic colour.

---

## Loading and error

- **Skeleton**: `--surface-2` block at the real element's dimensions with a
  1.4s shimmer sweeping `--surface-3`. Skeleton the card body, keep the real
  card header — the page shouldn't reflow when data lands.
- **Inline error**: a `--danger-bg` panel with a `1px solid var(--danger)` border,
  `--r-sm`, containing a 14px icon, the message in `--text`, and a `Retry` ghost button.
- Never use a full-page spinner for a settings tab. Skeleton the card that is loading.