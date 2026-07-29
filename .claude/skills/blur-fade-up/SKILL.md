---
name: blur-fade-up
description: "Staggered blur-in entrance animation (\"blur fade up\" / blur reveal) where text, icons, and buttons start blurred, transparent, and offset downward, then sharpen and rise into place one after another. Also covers liquid-glass buttons and masked backdrop-blur overlays. Use when asked for a blur reveal, staggered fade-in, cinematic hero entrance, frosted/liquid glass UI, or a blur that fades across the screen."
origin: test-prj/cinematic-hero
---

# blur-fade-up — staggered blur-in entrance animation

The effect: elements begin at `opacity: 0`, `blur(20px)`, and 40px below their
resting position, then sharpen and rise over 1s. Each element starts slightly
after the previous one — that offset is the **stagger**, and it's what makes the
page feel composed rather than dumped on screen.

Pure CSS — no JS, no observer, no `framer-motion`. It fires once at first paint.
For **scroll-triggered** reveals or exit animations, use `framer-motion`
(already a dependency here) instead; see the `motion-ui` skill. This one is for
above-the-fold entrances, where a JS-driven variant costs you a flash of
unstyled content on hydration.

Drop-in stylesheet: `assets/blur-fade-up.css` next to this file. Extracted from
a working Vite + React hero (`~/test-prj`, `src/index.css` + `src/App.jsx`).

## Three different blurs — don't confuse them

| | What it blurs | Property | Used for |
|---|---|---|---|
| **Entrance** | the element itself | `filter: blur()` inside `@keyframes` | the reveal animation |
| **Glass** | what's *behind* the element | `backdrop-filter: blur()` | frosted pills, cards |
| **Masked overlay** | what's behind, fading out | `backdrop-filter` + `mask-image` | blur that dissolves across the viewport |

`filter` blurs the element. `backdrop-filter` blurs the background showing
through it. Reaching for the wrong one is the single most common mistake here.

## Install

In **this** repo the rules already live in `src/index.css` — nothing to install.
For a **new** project:

```bash
cp .claude/skills/blur-fade-up/assets/blur-fade-up.css src/
```

Then import it after your Tailwind directives (or anywhere, if no Tailwind):

```css
@import './blur-fade-up.css';
```

The file is plain CSS — no Tailwind, no build step, no dependencies. It parses
clean through PostCSS + autoprefixer (verified).

## Use it

Add the class, then give each element its own delay:

```jsx
<h1 className="animate-blur-fade-up" style={{ animationDelay: '400ms' }}>
  Step Through. Work Smarter.
</h1>
```

For a list, derive the delay from the index so you never hand-maintain a ladder:

```jsx
{LINKS.map((link, i) => (
  <a key={link} className="animate-blur-fade-up"
     style={{ animationDelay: `${100 + i * 50}ms` }}>
    {link}
  </a>
))}
```

The stylesheet also accepts `--delay` if you prefer CSS variables over inline
`animationDelay`: `style={{ '--delay': '400ms' }}`.

### Picking the stagger

Two rules that matter more than the exact numbers:

1. **50ms between siblings** in a row/list. Below ~30ms they read as
   simultaneous; above ~120ms the page feels sluggish.
2. **Chrome first, content second.** Navbar starts at 0ms, hero content
   restarts around 300ms. The two groups overlap — the hero's metadata (300ms)
   fires while nav links are still arriving. That overlap is deliberate; a
   strictly serial ladder makes the last element wait too long.

The ladder shipping in `src/App.jsx`:

| Element | Line | Delay |
|---|---|---|
| Logo | `src/App.jsx:44` | 0ms |
| Nav links | `src/App.jsx:56` | `100 + i * 50` → 100–300ms |
| Search / User | `src/App.jsx:67`, `:75` | 350 / 400ms |
| Metadata row | `src/App.jsx:152` | 300ms |
| Title | `src/App.jsx:171` | 400ms |
| Description | `src/App.jsx:179` | 500ms |
| Watch Now / Learn More | `src/App.jsx:188`, `:195` | 600 / 700ms |
| Previous / Next | `src/App.jsx:206`, `:213` | 800 / 900ms |

## Gotchas

- **`opacity: 0` on the base class is not optional.** Without it the element
  paints at full opacity for one frame before the first keyframe lands — a
  visible flash on every load. It's in the class for that reason; don't
  "clean it up."
- **`forwards` is not optional either.** Drop it and every element snaps back
  to invisible the instant its animation ends.
- **This is an `animation`, not a `transition`.** It fires once, on mount, with
  no state change to react to. If you need it to re-fire (route change,
  scroll-into-view), remount the node with a changing `key`, or toggle the class
  off and force a reflow (`void el.offsetWidth`) before adding it back.
- **Animating `filter` is GPU-expensive.** Fine for the ~12 elements of a hero.
  Applying it to a long list will drop frames — animate `opacity`/`transform`
  only past ~20 elements.
- **`backdrop-filter` needs the `-webkit-` prefix** for Safari, and it does
  nothing unless there's something behind the element to blur. A glass pill on
  a flat background looks like a plain transparent box.
- **A parent with `overflow: hidden` clips the 40px rise.** The element gets cut
  off mid-travel instead of sliding in.
- **Tailwind v4 scans the whole project tree, including this skill.** v4 does
  automatic content detection from the project root, with no `content:` array to
  scope it. Two measured consequences in this repo:
  - The nested `wandor/` and `halo/` apps leak into the root app's bundle — the
    root CSS went 19.28 kB → 32.25 kB, and `dist/assets/*.css` now contains
    `.bg-[#2B2644]`, a color used **only** in `halo/`, never in `src/`.
  - Class names written in this `SKILL.md` get compiled too (~1 kB).

  Harmless for a demo, wrong for production. Fix by giving each app its own
  root, or with `@source` / `@source not` directives in the entry CSS.
- **Respect `prefers-reduced-motion`.** The shipped stylesheet already disables
  the animation and forces `opacity: 1` under that media query. Without the
  `opacity: 1` half, reduced-motion users get a permanently invisible page —
  because the base class hides it.

## The gradient-hairline glass border

`.liquid-glass::before` draws a 1.4px border whose brightness varies top-to-
bottom (bright at edges, invisible in the middle) — it reads like light catching
a bevel. The trick is the double mask:

```css
padding: 1.4px;                       /* = border thickness */
-webkit-mask:
  linear-gradient(#fff 0 0) content-box,   /* the inner area */
  linear-gradient(#fff 0 0);               /* the whole box   */
-webkit-mask-composite: xor;               /* whole MINUS inner = border ring */
mask-composite: exclude;                   /* standard-syntax equivalent */
```

Both the `-webkit-` and standard `mask-composite` lines are required — they use
different keywords (`xor` vs `exclude`) for the same operation. Ship both.

Requires `position: relative` and `border-radius: inherit` on the pseudo-element,
or the ring detaches from the button's corners.

## Masked backdrop blur

To blur only part of the viewport and have it dissolve:

```jsx
<div className="bottom-blur-mask pointer-events-none fixed inset-0 z-[1] backdrop-blur-xl" />
```

`.bottom-blur-mask` applies `mask-image: linear-gradient(to top, black 0%,
transparent 45%)` — opaque (blurred) at the bottom, gone by 45% up. Notes:

- **`pointer-events-none` is mandatory.** It's a full-screen fixed div; without
  it, nothing underneath is clickable.
- The mask affects *where the blur shows*, not *how strong* it is. It creates no
  darkening — pair it with a gradient overlay if you also want contrast.
- Sits between the background (z-0) and content (z-10) — see `src/App.jsx:36`.

## Verify it

The dev server serves the animation without a build step:

```bash
npm run dev                                          # → http://localhost:5173/
curl -s http://localhost:5173/src/index.css | grep blurFadeUp
```

To confirm the whole thing compiles into a production bundle:

```bash
npm run build
```

Because the animation runs once at load and finishes in under a second, a
screenshot taken after ~1.5s shows the *settled* state. To capture it mid-flight
you have to freeze it — set `animation-play-state: paused` on
`.animate-blur-fade-up` in devtools, or scrub `animation-delay` to a negative
value (`-500ms` jumps to the halfway frame).
