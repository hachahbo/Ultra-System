# Verification checklist

Run this per tab. Report pass/fail per line — do not mark a tab complete until
every line passes. The first two sections are the ones that actually caused the
problems in the original design.

## Accent budget

- [ ] Count the orange elements on the rendered screen. **4 or fewer.**
- [ ] Every one is a sanctioned use: primary button · active nav marker ·
      progress/meter fill · focus ring. (Toggle/checkbox "on" fills and the org
      mark are exempt — they are state and branding, not decoration.)
- [ ] No card header icon is orange
- [ ] No section heading is orange
- [ ] No "Edit" link or secondary action is orange
- [ ] No badge is orange
- [ ] Exactly one `.btn-primary` exists on the page

## Colour hygiene

- [ ] `grep -rn '#F97316\|#FF6B1A\|#EA6A0A\|rgba(249' --include='*.vue' --include='*.ts'`
      returns nothing outside `tokens.css`
- [ ] No hex literal of any kind remains in a component file
- [ ] No `radial-gradient` behind any card header
- [ ] No warm/brown surface colour anywhere — surfaces come from the neutral ramp
- [ ] No Tailwind default palette classes (`bg-zinc-*`, `text-gray-*`,
      `border-neutral-*`) in the files touched
- [ ] `--border` is not used on any interactive element; those use `--border-ctrl`

## Contrast

- [ ] Every text/background pair measures ≥ 4.5:1
- [ ] Every interactive boundary measures ≥ 3:1
- [ ] `--text-subtle` is `#8B8B93` in dark, not `#71717A` (which fails at 3.8:1)
- [ ] Orange text in light mode uses `--accent-text` (`#C2410C`), never `--accent`
- [ ] Every thin/small accent mark uses `--accent-text`: focus ring, active-nav
      bar, sort chevrons, icons. `--accent` only fills areas
- [ ] Chart series use the current mode's own steps, not the other mode's hexes
- [ ] Dimmed glyphs still clear 3:1 in light — low opacity over white fails
- [ ] No colour baked into an SVG `data:` URI is wrong for the active theme
      (`var()` can't reach inside one — grep `%23`)
- [ ] **Screenshot every screen in BOTH themes and compare.** Light mode is not
      done because the tokens exist; it is done when you have looked at it

## Typography

- [ ] Inter for all UI text, JetBrains Mono for identifiers only
- [ ] No prose in mono, no IDs in Inter
- [ ] Only the six sizes from the scale are used
- [ ] Uppercase labels are 11px/600 with `.06em` tracking
- [ ] Only display and title carry negative tracking

## Layout

- [ ] Grid columns are `248px / 188px / 1fr`
- [ ] Page padding `28px 32px`, max-width 1240px, grid gap 20px
- [ ] Card grid uses `align-items: start`
- [ ] The two columns end within ~80px of each other at 1600px wide
- [ ] `document.documentElement.scrollWidth === window.innerWidth` — no
      horizontal page scroll at 1280px, 1440px and 1600px
- [ ] Single column below 1180px; sidebars hidden below 900px
- [ ] Tables either reflow to cards or scroll inside their own container

## Content and states

- [ ] No `—`, `N/A`, `Not specified`, or empty cell anywhere
- [ ] Every empty field is an `Add <field>` button
- [ ] Every empty list has a block empty state with an action
- [ ] Every card has exactly one `Edit`-style affordance, or none has one
- [ ] Sensitive identifiers are masked by default
- [ ] Loading renders skeletons, not a page spinner
- [ ] Error states offer a retry

## Accessibility

- [ ] `:focus-visible` ring visible on every interactive element — tab through
      the whole page and confirm nothing is invisible when focused
- [ ] Every icon-only button has an `aria-label`
- [ ] Toggles and checkboxes wrap a real input; label clicks toggle them
- [ ] Tables use `<th scope="col">`
- [ ] Dialogs trap focus, close on Escape, and restore focus on close
- [ ] Colour is never the sole carrier of meaning — status badges pair colour
      with a text label
- [ ] `prefers-reduced-motion` is honoured

## Cross-tab consistency

Screenshot all five tabs at 1600×1000 and compare side by side:

- [ ] Page headers are visually identical in size, spacing and alignment
- [ ] Card headers are identical in height and icon treatment
- [ ] Label styling is identical
- [ ] Control heights are identical (34px buttons, 36px inputs)
- [ ] The active sub-nav marker looks the same on all five
- [ ] Nothing on Preferences/Security/Notifications/Team looks like it came from
      a different design than Profile