---
name: liquid-glass
description: "Build frosted translucent glass surfaces — buttons, pills, nav bars, cards — with a specular gradient edge (glassmorphism / Apple \"Liquid Glass\"). Use when asked for glass buttons, frosted or blurred panels, glassmorphism, translucent overlays, backdrop-blur UI, or a control that sits over video or imagery."
origin: test-prj/cinematic-hero
---

# liquid-glass — frosted surfaces with a specular edge

Generic name: **glassmorphism**. This specific variant is what Apple named
**Liquid Glass** — the difference is the **specular edge**, a hairline border
that's bright where light would catch a bevel and invisible elsewhere. Without
it you get a blurry rectangle; with it the element reads as a physical pane.

Drop-in stylesheet: `assets/liquid-glass.css` next to this file.

## The one prerequisite

**Glass needs something busy behind it.** `backdrop-filter` blurs the
*backdrop* — over a flat color there is nothing to blur, and the whole effect
collapses to a faint outline. Use it over video, photography, or a strong
gradient. If the design has a flat background, you want a solid or subtly
tinted surface instead, not this.

## Install

```bash
cp .claude/skills/liquid-glass/assets/liquid-glass.css src/app/
```

Add one line to `src/app/globals.css`, below the existing imports
(`tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`):

```css
@import "./liquid-glass.css";
```

Verified: the stylesheet parses clean through PostCSS + autoprefixer, 8 rules,
zero warnings.

## Use

```jsx
<button className="liquid-glass rounded-full px-6 py-2.5 text-white">
  Learn More
</button>

<div className="liquid-glass liquid-glass--panel rounded-3xl p-8">…</div>
```

Variants compose with the base class:

| Class | Use for |
|---|---|
| `liquid-glass` | pills, icon buttons, nav chips — 4px blur |
| `--panel` | cards holding body copy — 20px blur, 6% fill |
| `--thick` | 3px specular edge instead of 1.4px |
| `--on-light` | glass over a *light* backdrop (flips edge + highlight to black) |

Radius, padding, and text color stay in Tailwind — the class only supplies the
material.

## How it's built — four layers

**1. The frost.** Blurs what's behind, not the element itself.

```css
-webkit-backdrop-filter: blur(4px);   /* Safari — omit and it silently no-ops */
backdrop-filter: blur(4px);
```

4px is deliberately low for small controls. You should still be able to read the
motion behind a pill; heavy blur makes it look like a solid chip.

**2. The fill — almost nothing.**

```css
background: rgba(255, 255, 255, 0.01);
background-blend-mode: luminosity;
```

1% white exists mainly as a carrier for `background-blend-mode: luminosity`,
which keeps the brightness of the backdrop while discarding its color — a subtle
desaturation that stops the glass from picking up whatever hue is behind it.

**3. The inner highlight.**

```css
box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
```

1px of white along the *inside* top edge — the thickness cue.

**4. The specular border — the actual trick.**

CSS can't apply a gradient to `border`. So: fill a pseudo-element with the
gradient, then mask away everything but a ring.

```css
.liquid-glass::before {
  inset: 0;
  padding: 1.4px;             /* == ring thickness */
  border-radius: inherit;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%,   /* bright top    */
    rgba(255,255,255,0)   40%,   /* invisible mid */
    rgba(255,255,255,0)   60%,
    rgba(255,255,255,0.45) 100%);/* bright bottom */

  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,  /* A: inner area */
    linear-gradient(#fff 0 0);              /* B: whole box  */
  -webkit-mask-composite: xor;              /* B − A = ring  */
  mask-composite: exclude;                  /* standard twin */
}
```

The gradient is bright at 0% and 100%, transparent through the middle — so the
edge glows top and bottom and disappears at the sides, mimicking a light source
above and a reflection below.

## Gotchas

- **Ship both `mask-composite` lines.** WebKit spells the operation `xor`, the
  standard spells it `exclude`. They are not aliases — each engine reads only
  its own, and dropping one breaks that engine.
- **`border-radius: inherit` on the pseudo-element**, or you get a rectangular
  ring floating over a pill.
- **`position: relative` on the parent**, or the ring escapes to the nearest
  positioned ancestor.
- **`pointer-events: none` on the ring.** It covers the whole element; without
  this it swallows clicks and the button stops working.
- **Never set a real `border`.** It stacks with the ring and reads as a double
  outline. The base class sets `border: none` for that reason.
- **`backdrop-filter` creates a stacking context** and is GPU-expensive. A dozen
  glass pills is fine; a scrolling list of them will drop frames on mobile.
  It also forces the whole subtree onto its own compositing layer, which can
  produce visible seams between adjacent glass elements.
- **Nested glass double-blurs.** A `liquid-glass` card containing
  `liquid-glass` buttons blurs the already-blurred backdrop — the inner control
  turns to mush. Use a plain translucent fill for children instead.
- **`overflow: hidden` on the base class clips child content** that was meant to
  overhang (badges, tooltips). It's there to keep the ring inside the radius —
  if you need overhang, drop it and clip the ring another way.
- **Contrast is not free.** Translucent surfaces fail WCAG contrast unpredictably
  because the backdrop moves — with video behind it, text contrast changes frame
  to frame. Put a darkening scrim under text, or keep glass to controls whose
  label is short and large.
- **Tailwind v4 (used here) auto-detects content from the project root.** Class
  names written in markdown inside the repo — including this file — get compiled
  into the bundle. Measured at roughly 1 kB in the origin project. Scope with
  `@source not` if it matters.

## Fallback

The stylesheet ships an `@supports not (backdrop-filter: ...)` block that swaps
in a 12% white fill for browsers without support (Firefox <103, older WebViews).
Without it those users see a nearly invisible button — 1% white on video.

Tailwind's `backdrop-blur-*` utilities are the equivalent shorthand for the
frost layer alone; they do **not** give you the specular edge, which is the part
that makes it read as glass rather than as a blur.

## Verify

```bash
npx postcss src/app/liquid-glass.css -o /dev/null   # parses clean
```

Visual check requires a busy backdrop — put the button over a video or photo,
then confirm three things by eye: the backdrop is visibly blurred *through* the
control, the top and bottom edges are brighter than the left and right, and the
button still responds to clicks (a ring missing `pointer-events: none` looks
identical but is dead).
