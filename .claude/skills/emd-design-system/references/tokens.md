/* ============================================================================
   EMD Organization — design tokens
   Drop at assets/css/tokens.css and register in nuxt.config.ts:
       css: ['~/assets/css/tokens.css']

   Every value below has been contrast-measured. Ratios are noted inline.
   Semantic names only — never reference a raw hex in a component.
   ============================================================================ */

/* ---------------------------------------------------------------- DARK (default) */
:root,
:root[data-theme='dark'] {
  /* surfaces — true neutral, so orange is the only warm thing on screen */
  --bg:            #0B0B0C;
  --surface:       #131315;
  --surface-2:     #1A1A1D;
  --surface-3:     #212125;

  /* borders — three tiers, and they are NOT interchangeable */
  --border:        #26262A;   /* decorative separation between surfaces */
  --border-strong: #33333A;   /* dividers, raised chips */
  --border-ctrl:   #63636D;   /* interactive outlines — 3.1:1, WCAG 1.4.11 */

  /* text */
  --text:          #F4F4F5;   /* 16.9:1 on surface */
  --text-muted:    #A1A1AA;   /*  7.2:1 */
  --text-subtle:   #8B8B93;   /*  5.5:1 — labels. NOT #71717A, that fails AA */

  /* accent — budget of 4 uses per screen, see SKILL.md rule 1 */
  --accent:        #F97316;
  --accent-hover:  #FB8A3C;
  --accent-press:  #EA6A0A;
  --accent-text:   #F97316;                  /* orange as text: 7.0:1 on --bg */
  --accent-subtle: rgba(249, 115, 22, 0.12);
  --accent-border: rgba(249, 115, 22, 0.35);
  --on-accent:     #1A0C02;                  /* text on an accent fill: 6.8:1 */

  /* semantic status */
  --success:    #22C55E;  --success-bg: rgba(34, 197, 94, 0.12);
  --warning:    #EAB308;  --warning-bg: rgba(234, 179, 8, 0.12);
  --danger:     #EF4444;  --danger-bg:  rgba(239, 68, 68, 0.12);
  --info:       #3B82F6;  --info-bg:    rgba(59, 130, 246, 0.12);

  /* floating elements only — see SKILL.md rule 4 */
  --shadow-pop:  0 8px 24px rgba(0, 0, 0, 0.55);
  --shadow-modal:0 24px 60px rgba(0, 0, 0, 0.7);
  --scrim:       rgba(0, 0, 0, 0.6);

  /* chart roles — a channel of their own, NOT part of the accent budget.
     Documented categorical slots 1–2, validated on #131315:
     CVD ΔE 26.8 protan / 32.4 tritan · normal-vision 31.8 · contrast ≥3:1 */
  --series-1:      #3987E5;
  --series-2:      #D95926;
  --series-1-soft: rgba(57, 135, 229, 0.16);
  --series-2-soft: rgba(217, 89, 38, 0.14);
  --grid:          #232327;   /* one shade off the surface */
}

/* ---------------------------------------------------------------- LIGHT */
:root[data-theme='light'] {
  --bg:            #FAFAFA;
  --surface:       #FFFFFF;
  --surface-2:     #F4F4F5;
  --surface-3:     #E9E9EC;

  --border:        #E4E4E7;
  --border-strong: #D4D4D8;
  --border-ctrl:   #8B8B93;   /* 3.4:1 on white */

  --text:          #18181B;   /* 17.7:1 */
  --text-muted:    #52525B;   /*  7.7:1 */
  --text-subtle:   #6B6B75;   /*  5.3:1 */

  --accent:        #F97316;   /* fill stays brand orange */
  --accent-hover:  #EA6A0A;
  --accent-press:  #C2410C;
  --accent-text:   #C2410C;   /* orange TEXT must darken — #F97316 is 2.8:1 on white */
  --accent-subtle: rgba(249, 115, 22, 0.10);
  --accent-border: rgba(249, 115, 22, 0.45);
  --on-accent:     #1A0C02;

  --success:    #15803D;  --success-bg: rgba(21, 128, 61, 0.10);
  --warning:    #A16207;  --warning-bg: rgba(161, 98, 7, 0.10);
  --danger:     #DC2626;  --danger-bg:  rgba(220, 38, 38, 0.10);
  --info:       #1D4ED8;  --info-bg:    rgba(29, 78, 216, 0.10);

  --shadow-pop:  0 8px 24px rgba(16, 16, 20, 0.12);
  --shadow-modal:0 24px 60px rgba(16, 16, 20, 0.18);
  --scrim:       rgba(16, 16, 20, 0.4);

  /* chart roles — documented LIGHT slots 1–2, validated on #FFFFFF:
     CVD ΔE 24.7 protan / 32.7 tritan · normal-vision 33.6 · contrast ≥3:1.
     These are re-stepped for the light surface, not the dark hexes reused. */
  --series-1:      #2A78D6;
  --series-2:      #EB6834;
  --series-1-soft: rgba(42, 120, 214, 0.16);
  --series-2-soft: rgba(235, 104, 52, 0.14);
  --grid:          #E9E9EC;
}

/* Follow the OS when the user has not chosen explicitly */
@media (prefers-color-scheme: light) {
  :root:not([data-theme='dark']) {
    --bg: #FAFAFA;           --surface: #FFFFFF;
    --surface-2: #F4F4F5;    --surface-3: #E9E9EC;
    --border: #E4E4E7;       --border-strong: #D4D4D8;  --border-ctrl: #8B8B93;
    --text: #18181B;         --text-muted: #52525B;     --text-subtle: #6B6B75;
    --accent-hover: #EA6A0A; --accent-press: #C2410C;   --accent-text: #C2410C;
    --accent-subtle: rgba(249,115,22,0.10);
    --accent-border: rgba(249,115,22,0.45);
    --success: #15803D; --success-bg: rgba(21,128,61,0.10);
    --warning: #A16207; --warning-bg: rgba(161,98,7,0.10);
    --danger:  #DC2626; --danger-bg:  rgba(220,38,38,0.10);
    --info:    #1D4ED8; --info-bg:    rgba(29,78,216,0.10);
    --shadow-pop: 0 8px 24px rgba(16,16,20,0.12);
    --shadow-modal: 0 24px 60px rgba(16,16,20,0.18);
    --scrim: rgba(16,16,20,0.4);
  }
}

/* ---------------------------------------------------------------- SHAPE + RHYTHM */
:root {
  /* radius — exactly three steps, no others */
  --r-sm:   6px;    /* controls: buttons, inputs, nav items, chips */
  --r-md:   12px;   /* cards, panels, modals */
  --r-pill: 999px;  /* badges, avatars, floating toggles */

  /* spacing — 4px base */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-7: 28px; --sp-8: 32px;

  /* fixed layout metrics */
  --sidebar-w:  248px;
  --subnav-w:   188px;
  --topbar-h:   56px;
  --card-pad:   18px;
  --grid-gap:   20px;
  --page-pad-y: 28px;
  --page-pad-x: 32px;
  --page-max:   1240px;

  /* control heights */
  --h-btn:    34px;
  --h-btn-sm: 28px;
  --h-input:  36px;
  --h-row:    52px;

  /* type */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  --t-display: 600 22px/1.25 var(--font-sans);
  --t-title:   600 20px/1.3  var(--font-sans);
  --t-heading: 600 13.5px/1.4 var(--font-sans);
  --t-body:    400 14px/1.5  var(--font-sans);
  --t-small:   400 12.5px/1.5 var(--font-sans);
  --t-label:   600 11px/1.4  var(--font-sans);

  --track-tight: -0.02em;   /* display + title only */
  --track-label:  0.06em;   /* uppercase labels only */

  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --dur-fast: 120ms;
  --dur:      180ms;
}

/* ---------------------------------------------------------------- BASE */
*, *::before, *::after { box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font: var(--t-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Sanctioned accent use #4 — never remove this */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--r-sm);
}

::selection { background: var(--accent-subtle); color: var(--text); }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: var(--r-pill);
  border: 2px solid transparent;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover { background-clip: content-box; background-color: var(--border-ctrl); }
::-webkit-scrollbar-track { background: transparent; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}