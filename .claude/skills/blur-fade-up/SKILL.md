---
name: blur-fade-up
description: "Staggered blur-in entrance animation (\"blur fade up\" / blur reveal) where text, icons, and buttons start blurred, transparent, and offset downward, then sharpen and rise into place one after another. Use when asked for a blur reveal, staggered fade-in, a cinematic hero entrance, elements that animate in one after another, or a backdrop blur that fades out across the screen. For frosted glass surfaces themselves, see the liquid-glass skill."
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

```bash
cp .claude/skills/blur-fade-up/assets/blur-fade-up.css src/app/
```

Then add one line to `src/app/globals.css`, below the existing imports
(`tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`):

```css
@import "./blur-fade-up.css";
```

The file is plain CSS — no Tailwind, no build step, no dependencies. It parses
clean through PostCSS + autoprefixer (verified).

**Next.js note:** the class must be on a component that reaches the browser.
It works in Server Components (it's just CSS in the HTML), and the animation
starts at first paint rather than on hydration — that's the point of using CSS
here rather than JS.

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

A full hero ladder, as a starting point to copy:

| Element | Delay |
|---|---|
| Logo | 0ms |
| Nav links | `100 + i * 50` → 100–300ms |
| Search / profile buttons | 350 / 400ms |
| Metadata row | 300ms |
| Headline | 400ms |
| Subhead | 500ms |
| Primary / secondary CTA | 600 / 700ms |
| Prev / next controls | 800 / 900ms |

Total runway ~1.9s (900ms delay + 1s duration). Past that it stops reading as
choreography and starts reading as a slow page.

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
- **Tailwind v4 (used here) scans the whole project tree, including this skill
  file.** v4 does automatic content detection from the project root, with no
  `content:` array to scope it. Measured in the origin project: an unrelated
  nested app leaked its utilities into the main bundle (19.28 kB → 32.25 kB,
  including a `.bg-[#2B2644]` color that appeared in no source file of the app
  being built), and class names written inside the `SKILL.md` itself compiled
  too (~1 kB). Scope it with `@source` / `@source not` in `globals.css` if the
  bundle looks larger than the app's own markup justifies.
- **Respect `prefers-reduced-motion`.** The shipped stylesheet already disables
  the animation and forces `opacity: 1` under that media query. Without the
  `opacity: 1` half, reduced-motion users get a permanently invisible page —
  because the base class hides it.

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
- Layer it between the background (z-0) and the content (z-10).

For the glass surfaces that usually accompany this effect, see the
`liquid-glass` skill.

## Verify it

Because the animation runs once at load and finishes in under a second, a
screenshot taken after ~1.5s shows the *settled* state. To capture it mid-flight
you have to freeze it — set `animation-play-state: paused` on
`.animate-blur-fade-up` in devtools, or scrub `animation-delay` to a negative
value (`-500ms` jumps to the halfway frame).
