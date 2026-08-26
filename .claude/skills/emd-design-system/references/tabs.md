# Settings tab specifications

Five tabs, one shared skeleton:

```
page header  (title · one-line description · optional ghost action · at most one primary)
────────────────────────────────────────────────────────────────
hero or toolbar   (optional — Profile has a hero, Team Members has a toolbar)
────────────────────────────────────────────────────────────────
card grid         (2 columns ≥1180px, 1 column below)
```

Read `components.md` before building any of these. Do not invent new components
mid-tab — if you need something that isn't specified, add it to `components.md`
first so the next tab reuses it.

---

## 1. Profile  `/settings/profile`

**Already built.** Port `assets/settings-profile-mockup.html` 1:1. Do not
redesign it. It is the reference every other tab is measured against.

Structure: hero card (identity block + profile-strength panel) then a 2×2 grid
of Personal Information · Employment · Contact Methods · Address.

Points that are easy to get wrong when porting:

- Profile strength lists **the exact missing fields as clickable chips**, not a
  vague "complete your profile" line
- Birth date and Tax ID are `UiSecretValue`; Employee ID is mono + copy
- Empty contact methods are dashed `Add …` buttons with a `Required` flag
- The hero's meta row shows location, join date and email as small icon+text pairs

---

## 2. Preferences  `/settings/preferences`

Header: **Preferences** — "How the workspace looks and behaves for you."
No primary action; changes save on interaction with a toast confirmation.

Four cards, all built from `UiSettingRow`.

### Appearance
| Setting | Control | Notes |
|---|---|---|
| Theme | Segmented: `Light` `Dark` `System` | Writes `data-theme` on `<html>`, persists to the user record |
| Interface density | Segmented: `Comfortable` `Compact` | Compact drops `--h-row` to 44px and card padding to 14px |
| Reduce motion | Toggle | Forces the `prefers-reduced-motion` branch |
| Sidebar | Segmented: `Expanded` `Collapsed` | Collapsed = icon rail at 64px |

The theme control is the one place to show a small visual preview: two 64×44
rounded thumbnails, one light one dark, selected one outlined in `--border-ctrl`
(not orange).

### Language & Region
Language (select) · Timezone (searchable select, default `Africa/Casablanca`) ·
Date format (segmented: `DD/MM/YYYY` `MM/DD/YYYY` `YYYY-MM-DD`) ·
Time format (segmented: `12h` `24h`) · First day of week (select).

Show a live preview line under the date/time controls in `--text-subtle`:
`Preview — 21/08/2026, 14:30`. It updates as they change the setting.

### Workspace defaults
Landing page after sign-in (select of the org nav items) ·
Default records per page (select: 25 / 50 / 100) ·
Remember last-used filters (toggle) ·
Default org chart orientation (segmented: `Vertical` `Horizontal`) ·
Default expand depth (select: 1–5 levels).

### Accessibility
Always show focus outlines (toggle, on by default, non-destructive to disable) ·
Underline links in body text (toggle) · Increase base font size (segmented: `Default` `Large`).

---

## 3. Security  `/settings/security`

Header: **Security** — "Protect your account and manage where you're signed in."
No page-level primary action; each card owns its own.

Card order matters here — most-actionable first.

### Password
Single row: "Password" / "Last changed 4 months ago" with a **Change password**
ghost button. If it's over 12 months, add a `warn` badge reading `Ageing`.

Change password opens a dialog: current · new · confirm, with a strength meter
using the same `.bar` component as profile strength. The meter fill goes
`--danger` → `--warning` → `--success` — **not** `--accent`; this is a quality
signal, not a brand element.

### Two-factor authentication
Card header carries a status badge: `ok`/Enabled or `warn`/Not enabled.

Rows, one per method:
- **Authenticator app** — `Configured` badge, `Reconfigure` + `Remove` actions
- **SMS backup** — phone masked as `+44 ••• ••• 412`, `Add`/`Change`
- **Recovery codes** — "8 of 10 unused", `View codes` + `Regenerate`

Recovery codes render in `--font-mono` inside a `--surface-2` block, with
**Copy all** and **Download** buttons. Codes are `UiSecretValue`-masked until
the user reveals them.

### Active sessions
`UiTable`, card body padding 0.

| Device | Location | IP | Last active | |
|---|---|---|---|---|
| Chrome on macOS `+ badge "This device"` | Leeds, UK | `86.•••.•••.14` (mono) | 2 minutes ago | ⋯ |

- The current session gets an `info` badge and no revoke action
- Row menu: `Revoke session` in `--danger`
- Card footer: **Sign out of all other sessions** as `.btn-danger`
- Sessions older than 30 days get a `warn` badge reading `Stale`

### API tokens
`UiTable`: Name · Scopes (chips) · Created · Last used · ⋯

- Token prefix shown in mono, e.g. `emd_pat_9f2c…` — the full value appears
  exactly once, at creation, in a dialog with a copy button and a
  `warning`-styled note that it won't be shown again
- Never-used tokens show `Never` in `--text-subtle`
- Expired tokens: `danger` badge, row at 60% opacity
- Card action: **Generate token**
- Empty state: block form, "No API tokens", "Tokens let external services act on
  your behalf. Create one to get started."

### Danger zone
Last card. `border-color: var(--danger)` at 40% opacity, header icon chip in
`--danger-bg`/`--danger`. One or two rows, each with a `.btn-danger` action:
**Deactivate account** and, for owners, **Transfer ownership**. Both require a
confirmation dialog where the user types the org name to enable the confirm button.

---

## 4. Notifications  `/settings/notifications`

Header: **Notifications** — "Choose what reaches you, and where."
Ghost action: **Mute everything** (a toggle-all with an undo toast).

### The channel matrix — the centrepiece

One full-width card. Sticky column header row with three channel columns:
**In-app** · **Email** · **Push**.

```
                                        In-app   Email   Push
ORGANIZATION
  Structure changed                       [x]     [x]     [ ]
  Unit created or archived                [x]     [ ]     [ ]
  Relation type modified                  [x]     [ ]     [ ]
ACCESS & ROLES
  You were assigned a functional role     [x]     [x]     [x]
  A user joined a unit you manage         [x]     [x]     [ ]
  Permission level changed                [x]     [x]     [x]
PEOPLE
  Team member invited                     [x]     [ ]     [ ]
  Team member deactivated                 [x]     [x]     [ ]
SYSTEM
  New sign-in from an unrecognised device [x]     [x]     [x]
  Security alert                          [x]     [x]     [x]   ← locked
  Product updates                         [ ]     [x]     [ ]
```

Implementation notes:

- Category headers use the `--t-label` treatment (uppercase, `--text-subtle`),
  full-width, `padding: 16px 14px 8px`, with a top border above all but the first
- Event rows are `UiSettingRow` with the description as the sub-line
- Checkboxes are 16px, `--r-sm`, `--border-ctrl` when off, `--accent` fill with a
  white check when on. This is state, so it's within the accent budget
- **Column-level toggle**: clicking a channel header selects/deselects the whole
  column. Show it as a small `.btn-link` under the header reading `All` / `None`
- Security alerts are **locked on** for email — render the checkbox disabled with
  a tooltip: "Security notifications can't be turned off."
- On narrow screens the matrix becomes per-event cards with three inline toggles

### Delivery
Second card, `UiSettingRow`s:
- Email digest — segmented: `Instant` `Hourly` `Daily` `Weekly`
- Daily digest time — time select, disabled unless digest is Daily/Weekly
- Quiet hours — toggle + two time selects + a timezone note in `--text-subtle`
- Weekend delivery — toggle

### Email address
Small card showing where email notifications go, with a `Verified` badge and a
`.btn-link` to Contact Methods on the Profile tab. If unverified, show a
`warn` badge and a **Resend verification** button.

---

## 5. Team Members  `/settings/team`

Header: **Team Members** — "People with access to this workspace."
Primary action: **Invite member**.

### Toolbar

A full-width row above the table, not inside a card:
search input (flex 1, max 320px, leading magnifier icon) · Role select ·
Status select · Unit select · a `.btn-link` **Clear** that appears only when a
filter is set. Right side: a result count in `--text-subtle`
(`12 of 48 members`) and a density icon toggle.

Active filters render as removable chips below the toolbar — `--surface-3`
background, `--border-ctrl` border, label plus a 10px ✕.

### Members table

This is `UiDataTable` — build it from `references/datatable.md` first, then
configure it here. Do not hand-roll a second table.

| Member | Role | Units | Status | Last active | |
|---|---|---|---|---|---|
| `user` cell — avatar + name + email | select | chips, +N overflow | badge | relative-date | actions |

- Member cell: 32px pill avatar with initials, name 13.5px/500, email 12px `--text-subtle`
- Role is an inline `UiSelect` — editing in place, no dialog. Disabled for the
  last remaining owner, with a tooltip explaining why
- Units column shows up to 2 chips then `+3` in `--text-subtle`; the overflow
  opens a popover
- Status: `ok`/Active · `info`/Invited · `neutral`/Deactivated
- Invited rows show `Invited 3 days ago` in the Last active column plus a
  **Resend** `.btn-link`
- Row menu: `View profile` · `Change role` · `Manage units` · separator ·
  `Deactivate` in `--danger`
- Header checkbox enables bulk selection; when any row is selected the toolbar is
  replaced by a selection bar: `3 selected` + `Change role` + `Add to unit` +
  `Deactivate` (danger) + `Clear`
- Pagination footer inside the card: `Showing 1–25 of 48`, page buttons right

### Invite dialog

Email input that accepts multiple addresses as chips (comma or Enter to commit,
inline validation per chip) · Role select with a one-line description of the
selected role's permissions in `--text-subtle` · Unit multi-select ·
optional message textarea. Footer: ghost **Cancel** + primary **Send invitations**.

Success: close the dialog, prepend the invited rows in `info`/Invited state,
and show a toast.

### Pending invitations

A second card below the table, only rendered when invitations exist.
Rows: email (mono), role, invited-by, expiry in `--warning` when under 48h,
with **Resend** and **Revoke** actions.

### Empty states

- No members matching filters: block empty state, "No members match these
  filters", with a **Clear filters** ghost button
- No members at all (fresh workspace): block empty state with the **Invite
  member** primary action