# Ultra System (Darna) — Pitch & Design Source

> **What this document is:** the single source of truth for building the **client-facing slide deck** and the **poster / one-pager** in Claude Design.
> Everything here was verified against the actual codebase on **2026-08-18** (`main` @ `c84f7c6`, migrations `0001`–`0029`, Next 16.2.10 / React 19.2.4).
> Part 13 is a **fact ledger** — what is shipped vs. what is planned. **Never put a Part-13 "planned" item on a slide as if it exists.**

**How to use it**
| You want to build | Read |
|---|---|
| The pitch deck | Part 1, 3, 5, 8 (slide-by-slide script), 10 (design direction) |
| The poster / one-pager | Part 2, 7, 9, 10, 14 (copy bank) |
| A live demo script | Part 3 + Part 4 |
| To answer a hard client question | Part 11 + Part 13 |

---

# Part 1 — The Story (the emotional spine of the pitch)

## 1.1 The problem, in one sentence

> **Delivery platforms take your margin, and they keep your customers.**

A restaurant in Tangier that sells through an aggregator pays a commission on every order — and at the end of the year it has **zero** phone numbers of its own customers. The platform owns the relationship. The restaurant rents it.

Three costs, stacked:

| Cost | What it looks like | Who pays |
|---|---|---|
| **The commission** | A cut on every single order, forever | The restaurant |
| **The data hostage** | Name, phone, address, order history → held by the platform | The restaurant |
| **The cash delay** | Money settled days or weeks later | The restaurant's cash flow |

And on top: a printed menu that costs money to reprint, a dish that ran out at 8pm but is still on the menu at 9pm, an order shouted across a kitchen, a reservation written on a napkin.

## 1.2 The insight

> **An order that lives only in a WhatsApp thread is not a customer. It is a message.**

The number is trapped in a chat history. It can't be exported, counted, segmented, or called back. That is the same trap as the aggregator, just self-inflicted.

## 1.3 The promise

> **Every order and every reservation — with the customer's phone number — lands in a database the restaurant owns, and can export to CSV in one click.**

That is the core value. Everything else in this platform is built around it.

## 1.4 The one-line pitch

**EN —** *Your own ordering platform: your site, your customers, your data, zero commission per order.*

**FR —** *Votre propre plateforme de commande : votre site, vos clients, vos données, zéro commission par commande.*

---

# Part 2 — What The App Is

## 2.1 Definition (say this first, always)

**Ultra System is a complete restaurant operating platform, delivered as one branded website per restaurant.**

It has three faces:

1. **A public site your customers use** — branded, mobile-first, no app to download. Menu, ordering, reservations, events, gift codes.
2. **A back-office your team runs the restaurant on** — orders, kitchen screen, POS, tables, stock, recipes, staff, hours, analytics.
3. **A control plane we operate for you** — the platform where your site is designed, your plan is set, and your account is supported.

## 2.2 What it is *not*

- Not a delivery fleet. **Your driver, your delivery.**
- Not an app to download. **It's a website — it opens instantly.**
- Not a marketplace where you compete with 200 other restaurants for the same click. **It's your address.**

## 2.3 The category line

> It replaces: your printed menu + your reservation notebook + your order slips + your stock sheet + your Excel + your aggregator dependency.

---

# Part 3 — How It Works (the three journeys)

This is the heart of the demo. Three journeys, each one slide, each one poster panel.

## 3.1 Journey A — The customer (2 minutes, no download)

### Dine-in ("the invisible waiter")

```
Guest sits at table 5
   │
   ▼  scans the QR card on the table
Branded menu opens — table 5 is already attached, invisibly
   │
   ▼  picks dishes, chooses options (size, sauce, extras — priced)
Cart
   │
   ▼  confirms — no phone required, they're sitting right there
Order hits the kitchen screen with "TABLE 5" on it
```

**The line to say:** *"The customer never types a table number. The QR card knows. That's why the order can never land on the wrong table."*

### Delivery / takeaway

```
Customer opens yourrestaurant.ma
   │
   ▼  menu → cart → checkout
Name · phone · address  ← this is the capture
   │
   ▼  optional promo code applied and validated server-side
Order saved to YOUR database + appears live in the dashboard
   │
   ▼  your own driver delivers · cash or card on delivery
Payment marked settled in the reconciliation screen
```

**The line to say:** *"That phone number is now yours. Not rented. Yours — exportable to CSV, forever."*

### Reservation

```
Date · time · party size · name · phone (+ note)
   │
   ▼
Lands in the dashboard as "new"
   │
   ▼  you confirm or decline · one tap to WhatsApp the guest
Table assigned on the floor plan
```

### Also on the public site
- **Events** — public event listings + a private-event / privatisation inquiry form.
- **Gift codes** — a public page where a customer redeems a promo code.
- **Language switch** — French ⇄ English, on the whole site *and* the menu content.

## 3.2 Journey B — The restaurant team (the daily loop)

```
                       ┌──────────────────────────────┐
   QR / web order ────▶│  ORDERS  (live, sound alert)  │
   POS (staff order) ─▶│  newest first, unread badge   │
                       └───────────────┬───────────────┘
                                       │ routed by station
                                       ▼
                       ┌──────────────────────────────┐
                       │  KDS — kitchen display        │
                       │  ticket per station, realtime │
                       └───────────────┬───────────────┘
                                       │ served
                                       ▼
             ┌─────────────────────────┴─────────────────────────┐
             ▼                                                   ▼
   ┌──────────────────┐                                ┌──────────────────┐
   │ STOCK auto-drops │  ← recipes link dish→ingredient│ PAYMENT settled  │
   │ dish auto-86'd   │                                │ cash / card / due│
   └──────────────────┘                                └──────────────────┘
             │                                                   │
             └─────────────────────┬─────────────────────────────┘
                                   ▼
                        ┌──────────────────────┐
                        │ ANALYTICS · CUSTOMERS │
                        │ revenue, top dishes,  │
                        │ hours, CSV export     │
                        └──────────────────────┘
```

**Each person sees only their screen.** Four roles, enforced at four layers (see 6.3):

| Role | Sees | Typical person |
|---|---|---|
| **Owner** | Everything, incl. money, staff, settings, analytics | The patron |
| **Manager** | Operations + customers + events, no staff/settings/analytics | The gérant |
| **Serveur** | Orders, KDS, tables, reservations, menu | Floor staff |
| **Cuisine** | Orders, KDS, menu, stock | Kitchen |

## 3.3 Journey C — The operator (why the client never touches code)

```
We create the restaurant  →  we design the site in the Site Builder
   (colors, fonts, hero images, gallery, section order, copy)
                              │
                              ▼  draft → preview → publish
                     The live branded site
                              │
                              ▼
              Plan set (Free / Pro / Enterprise)
              Features switched on or off per restaurant
              Subscription, trial, suspension, audit log
```

**The line to say:** *"You never open a design tool. You tell us what you want it to feel like; we publish it. You only ever open the dashboard."*

---

# Part 4 — The Feature Catalogue

Each block below is **one potential slide** and each has: what it is → what the client gets.

### 4.1 The branded public site
7 pages — Home, Menu, Reservation, About, Contact, Events, Gifts. Per-restaurant colors, font pairing (9 curated pairs), hero images, gallery, section order and section copy — all set from the Site Builder and published in one click. Mobile-first. French ⇄ English.
→ **A real website, not a listing on someone else's platform.**

### 4.2 Digital menu with customization
Categories, items, photos, prices, out-of-stock state, and priced customization groups (size, sauce, extras, required/optional, max selections).
→ **Menu changes cost 0 MAD and take 30 seconds — from your phone. And the options sell for you.**

### 4.3 Dine-in QR ordering — "the invisible waiter"
A printable QR card per table; the table number rides invisibly with the order.
→ **Fewer trips, fewer mistakes, faster turnover — and no reprinting menus.**

### 4.4 Delivery & takeaway
Name + phone + address captured on every order. Cash on delivery or card on delivery. Delivery fee per restaurant. Toggle dine-in and delivery independently.
→ **You keep the customer, the margin and the driver.**

### 4.5 Reservations
Date, time, party size, name, phone, note. New → confirmed / declined. Day filters, table assignment, one tap to WhatsApp the guest.
→ **The napkin is gone. So are the double-bookings.**

### 4.6 Live orders + realtime alerts
Orders stream in live with a sound alert, an unread badge and toast notifications with actions. Newest first.
→ **Nobody has to refresh a screen or watch a phone.**

### 4.7 KDS — kitchen display system
Tickets routed to the right station (hot, cold, bar…), pushed in realtime, marked off as they're fired.
→ **The kitchen stops guessing what's next.**

### 4.8 POS — staff order entry
Staff take a walk-in or phone order on the same system; it becomes a real order, in the same pipeline as everything else.
→ **One source of truth. Every ticket counted, wherever it came from.**

### 4.9 Payments & reconciliation
Payment method (cash / card on delivery) and payment status (unpaid / paid / refunded) tracked **separately from** fulfilment status, with who settled it and when. A reconciliation screen splits collected vs. outstanding.
→ **At closing, you know exactly what was served and exactly what was paid.**

### 4.10 Inventory
Ingredients, categories, suppliers, deliveries, stock levels and **variance tracking** (what should have been used vs. what actually was).
→ **You find out where the loss is, instead of feeling it in the bank.**

### 4.11 Recipes, costing & auto-86
Link a dish to its ingredients. The platform computes the plate cost and margin — and when an ingredient runs out, the dish **greys out on the public menu automatically**.
→ **You know the margin on every dish. And you never sell what you can't cook.**

### 4.12 Floor plan & table turnover
Visual table map, table sessions, turnover timing, printable QR cards per table.
→ **You see the room from the office.**

### 4.13 Staff, roles & labor
Invite staff, assign one of four roles, force password change on first login, clock in / clock out with hourly cost.
→ **The right screen for the right person, and labour cost you can actually read.**

### 4.14 Customers & CSV export
Every customer: name, phone, order count, last order, full order history. Search. **One-click CSV export.**
→ **This is the asset. It's yours, and you can walk away with it any day.**

### 4.15 Analytics
Revenue and order charts, top items, hourly distribution, per-period aggregates.
→ **Which dish, which hour, which day. Decisions instead of impressions.**

### 4.16 Promotions & promo codes
Promotion rules plus percentage/fixed discount codes with minimum order, max uses, expiry — validated server-side, never listable publicly.
→ **Run a real campaign, and stop it the second it stops paying.**

### 4.17 Events & privatisation
Publish events on the public site; receive private-event inquiries in the dashboard.
→ **Fill the empty Tuesday with a private booking.**

### 4.18 Multi-site & franchise
Multiple restaurants under one group, linked in a parent/child tree.
→ **Open a second location without starting over.**

---

# Part 5 — Plans (verified feature matrix)

| Capability | Free | Pro | Enterprise |
|---|:--:|:--:|:--:|
| Branded public site | ✅ | ✅ | ✅ |
| Online ordering (dine-in QR + delivery) | ✅ | ✅ | ✅ |
| Reservations | ✅ | ✅ | ✅ |
| Menu editor | ✅ | ✅ | ✅ |
| Events | ✅ | ✅ | ✅ |
| Customers + CSV export | ✅ | ✅ | ✅ |
| Analytics | — | ✅ | ✅ |
| Staff management & roles | — | ✅ | ✅ |
| Floor plan & tables | — | ✅ | ✅ |
| Inventory | — | ✅ | ✅ |
| Recipes & costing / auto-86 | — | — | ✅ |
| KDS (kitchen display) | — | — | ✅ |
| Promotions engine | — | — | ✅ |

> Any single feature can also be switched on or off **per restaurant** as an override — a Pro client can be given one Enterprise feature without changing plan. Pricing is a flat monthly or yearly fee in **MAD**, with trial support. *(Fill in the actual price points before the meeting — they are commercial, not technical.)*

**Slide line:** *"You pay one flat fee. Not a slice of every plate you sell."*

---

# Part 6 — Architecture & Trust

## 6.1 The client-safe version (use this on the slide)

```
   Customer's phone                Your team's phones/tablets            Us
        │                                    │                            │
   Your branded site  ─────────────▶   Your dashboard   ◀───────────  Control plane
        │                                    │                       (site design,
        └──────────────┬─────────────────────┘                        plan, support)
                       ▼
             ┌───────────────────────┐
             │   YOUR DATABASE       │
             │  orders · customers   │
             │  reservations · stock │
             │  isolated · exportable│
             └───────────────────────┘
```

**Three sentences that close the trust question:**
1. Your data sits in **your own isolated space** — another restaurant on this platform cannot see one row of yours, and that is enforced by the database itself, not by an app setting.
2. **You can export it whenever you want**, in one click, as a normal spreadsheet file.
3. The site runs on the **same infrastructure class as large-scale web products** — it's fast on a mobile connection, and it stays up.

## 6.2 The technical version (for a CTO in the room)

- **Next.js 16 (App Router) + React 19 + TypeScript**, deployed on **Vercel**.
- **Supabase / PostgreSQL** — database, auth, storage, realtime.
- **Row-Level Security** is the isolation boundary: a logged-in owner can only ever read or write rows carrying their own `restaurant_id`. App code is not trusted to filter.
- Public writes (orders, reservations) go through validated server routes — **prices are recomputed server-side from the database**, so a tampered client can't change a total.
- **29 database migrations**, indexed, with realtime publication for orders/reservations/KDS.
- Rate limiting on public endpoints, secret scanning in CI, pre-commit key-shape checks, forced password rotation for invited staff, full **audit log** on every platform-side mutation.
- Automated test suite (unit + end-to-end RBAC / i18n / accessibility) running in CI, plus Lighthouse performance budgets.

## 6.3 Four layers of access control (a strong slide on its own)

```
 1. Request proxy    →  is this person logged in, and allowed on this URL?
 2. Server layout    →  does this role get this screen at all?
 3. API guard        →  is this role allowed to perform this write?
 4. Postgres RLS     →  does this row even belong to this restaurant?
```

**Line:** *"A mistake would have to get past four independent doors. Layer 4 is the database itself — it can't be bypassed by any bug in the app."*

---

# Part 7 — Proof Points & Numbers (all verified)

Use these as poster stats / slide tiles. Do not invent others.

| Number | Meaning |
|---|---|
| **7** | public pages per restaurant site |
| **14** | back-office screens |
| **4** | staff roles, enforced at 4 independent layers |
| **29** | database migrations behind the platform |
| **11** | switchable feature modules |
| **9** | curated font pairings in the site builder |
| **2** | languages live end-to-end (FR / EN), site *and* menu content |
| **1 click** | to export your entire customer list |
| **0** | apps your customer has to download |
| **0 MAD** | cost to change your menu, any time |
| **0%** | commission taken per order |

---

# Part 8 — Slide Deck Script (18 slides, ready to design)

Format per slide: **Headline** · body/visual · *speaker note*.

---

**S1 — Title**
> ## Your restaurant. Your customers. Your data.
> Ultra System — the complete ordering, reservation and operations platform for restaurants.
Visual: full-bleed restaurant photo, logo, one line, nothing else.
*Note: say the name, say the one-liner, move on in 15 seconds.*

---

**S2 — The problem**
> ## You're paying twice.
> A commission on every order. And your customer list stays with them.
Visual: three stacked cost bars — Commission · Your data · Your cash flow.
*Note: don't name the competitor aggressively; describe the pain and let them name it.*

---

**S3 — The trap nobody names**
> ## An order in a WhatsApp thread is a message, not a customer.
> The number is stuck in a chat history. You can't export it, count it, or call it back.
Visual: a chat bubble dissolving into nothing vs. a solid database row.
*Note: this is the slide that separates us from "just take orders on WhatsApp".*

---

**S4 — The promise**
> ## Every order. Every reservation. Every phone number. In a database you own.
> One click to export it all.
Visual: the CSV export button, blown up, as hero.
*Note: this is the core. Everything else is packaging. Say that out loud.*

---

**S5 — What it is**
> ## One platform. Three faces.
> **Your site** — what your customers see. **Your dashboard** — how your team runs the service. **Our control plane** — how we build and support you.
Visual: three panels, three device frames.

---

**S6 — Journey: the guest at the table**
> ## The invisible waiter
> Scan → order → it lands in the kitchen with the table number already attached.
Visual: the 4-step QR flow from 3.1.
*Note: mention that the guest never types a table number — that's the "oh" moment.*

---

**S7 — Journey: delivery**
> ## Their number. Yours now.
> Name, phone, address on every delivery order — saved to your database, delivered by your driver, settled in cash or card.
Visual: the delivery flow, with the capture step highlighted.

---

**S8 — Journey: reservations**
> ## The notebook is gone.
> Date, time, party size, phone. Confirm or decline in one tap. Assign the table on the map.
Visual: reservation card + floor plan.

---

**S9 — The service loop**
> ## One order, one path, no shouting.
> Order → kitchen screen → stock drops → payment settled → analytics.
Visual: the full loop diagram from 3.2. **This is the deck's centerpiece — give it a full slide, no bullets.**

---

**S10 — The kitchen**
> ## Tickets that route themselves.
> Live kitchen display, per station, in realtime. Plus staff order entry on the same rails.
Visual: KDS mock, station columns.

---

**S11 — The margin**
> ## You know what every plate costs you.
> Recipes link dishes to ingredients. Cost and margin per dish. And when an ingredient runs out, the dish disappears from the menu by itself.
Visual: a dish card with cost/margin, and a greyed-out dish.
*Note: auto-86 is the single most impressive feature to a restaurateur. Slow down here.*

---

**S12 — The money**
> ## Served is not the same as paid.
> Payment status tracked separately from fulfilment. At closing: collected vs. outstanding, and who settled what.
Visual: reconciliation split.

---

**S13 — The team**
> ## The right screen for the right person.
> Owner · Manager · Serveur · Cuisine. Four roles, enforced at four independent layers — the last one is the database itself.
Visual: the 4-door diagram from 6.3.

---

**S14 — The asset**
> ## The list is the business.
> Every customer, their orders, their history — searchable, and exportable to a spreadsheet in one click.
Visual: the customers table + export.
*Note: repeat the S4 promise here. It's the only idea worth repeating twice.*

---

**S15 — Your brand, not a template**
> ## It looks like your restaurant. Because we build it that way.
> Colors, fonts, photos, sections, wording — designed for you and published in one click. You never open a design tool.
Visual: two tenant sites side by side, visibly different, same platform.
*Note: show two real tenants. This kills the "it's a template" objection instantly.*

---

**S16 — Plans**
> ## One flat fee. No cut of your sales.
Visual: the Part-5 matrix, three columns, checkmarks.

---

**S17 — Trust**
> ## Isolated. Encrypted. Exportable. Audited.
> Your rows are invisible to every other restaurant on the platform — enforced by the database, not by an app setting. And you can take your data with you any day.
Visual: the 6.1 diagram.

---

**S18 — Close**
> ## Let's put your restaurant on it.
> A working branded site, your menu loaded, your team trained.
> [Contact block]
*Note: end on the demo offer, not on a features recap.*

### Optional slides to keep in the back pocket
- **Multi-site / franchise** (only if they own more than one place)
- **Events & privatisation** (only for venues that do private hire)
- **Promo codes & campaigns** (only if they ask about marketing)
- **Roadmap** (Part 12 — only if they ask "what's next"; never lead with it)

---

# Part 9 — Poster / One-Pager Concepts

Three directions. Pick one; don't blend them.

## 9.1 Poster A — "The Loop" (recommended)
**Format:** A2 portrait (also works as A4 leave-behind and as a 1080×1350 social card.)
**Idea:** the whole restaurant on one page, as a single circular loop.

```
┌──────────────────────────────────────────┐
│  YOUR RESTAURANT. YOUR CUSTOMERS.        │  ← headline, top third, huge
│  YOUR DATA.                              │
│  ──────────────────────────────────────  │
│                                          │
│          ⟳  the loop diagram             │  ← centerpiece, 45% of the page
│   QR/web order → kitchen → stock →       │
│   payment → analytics → customer list    │
│                                          │
│  ──────────────────────────────────────  │
│  0%        1 click       0                │  ← 3 stat tiles from Part 7
│  commission  to export   apps to download │
│  ──────────────────────────────────────  │
│  logo · site · phone · "Book a demo"     │
└──────────────────────────────────────────┘
```
**Copy:** headline from 14.1, three stats, one CTA. Nothing else. No feature list.

## 9.2 Poster B — "Three Screens"
**Idea:** the product itself is the visual. Three device frames on a diagonal — phone showing the branded menu, tablet showing the KDS, laptop showing analytics.
**Copy:** one line per device, ~6 words each:
- *Your customers order here.*
- *Your kitchen cooks from here.*
- *You decide from here.*
Footer: one benefit line + CTA.
**Use when:** the audience is visual and skeptical — they want to see that it's real and finished.

## 9.3 Poster C — "The Comparison"
**Idea:** two columns, brutally simple.

| Through an aggregator | With Ultra System |
|---|---|
| A cut of every order | One flat monthly fee |
| They own the customer | You own the customer |
| You're one listing among hundreds | It's your own address |
| Menu locked to their format | Your brand, your photos, your words |
| Data you can't touch | One-click CSV export |

**Use when:** the client already sells on an aggregator and is angry about it. **Do not** use it as the first thing a cold prospect sees — leading with a competitor is a weak opening.

## 9.4 Poster mechanics (all three)
- Headline must be readable **from 3 meters**. If it needs two readings, it's too long.
- One CTA. One. With a QR code pointing at a live demo tenant.
- Show a real screenshot of a real tenant, never a lorem-ipsum mock.
- Leave the bottom 15% quiet — logo, contact, nothing competing.

---

# Part 10 — Design Direction (for Claude Design)

## 10.1 Positioning of the visual language
Warm, appetite-driven, confident — **hospitality, not SaaS**. The product screens are dense and technical; the pitch material must be the opposite: generous space, big type, food photography.

Avoid: generic startup gradients, blue-purple tech palettes, isometric illustrations, stock "team high-fiving" photos, and dashboard screenshots pasted at full width with no crop.

## 10.2 Palette
The live product themes are per-tenant, so the pitch material uses a **neutral house palette** that doesn't fight any client's brand:

| Role | Value | Use |
|---|---|---|
| Ink | `#1A1613` | Headlines, body |
| Warm terracotta | `#CD6133` | Primary accent, CTA (this is the pilot tenant's real brand hue — safe, warm, Moroccan) |
| Ember | `#FF6B35` | Highlights, active states, the one loud thing per page |
| Sand | `#F5EFE7` | Page background |
| Bone | `#FFFDFA` | Card surfaces |
| Olive | `#5B6547` | Secondary accent, "shipped / positive" states |
| Muted | `#8A8078` | Captions, labels |

Rule: **one accent per surface.** Terracotta carries the page; ember is used once, on the thing you want the eye to land on.

## 10.3 Typography
- **Display / headlines:** a high-contrast serif (Playfair Display, Fraunces, or Cormorant) — the deck should feel like a restaurant, not a spreadsheet.
- **Body / UI:** a clean grotesque (Inter, Work Sans) at generous line-height.
- Scale on a poster: headline ≥ 96pt, sub ≥ 32pt, stat numbers ≥ 120pt, body ≥ 18pt.
- Slide headlines: **6 words maximum.** If it doesn't fit in six, it's two slides.

## 10.4 Layout system
- 12-column grid, wide gutters, deliberate asymmetry — never center everything.
- One idea per slide. If a slide has a bullet list of more than 3 items, split it.
- Diagrams: flat, 2–3 colors, thick strokes, labels in the body font. No 3D, no drop shadows, no gradients on arrows.
- Screenshots: crop to the single element being discussed, on a soft sand background, slightly rounded corners.

## 10.5 Iconography & motifs
Line icons, 1.5–2px stroke, terracotta. Optional Moroccan motif — a **subtle** zellige/arabesque geometric pattern at very low opacity as a section divider or poster corner. Subtle. It should read as texture, never as decoration competing with the type.

## 10.6 Photography direction
Real food, real room, warm light, shallow depth of field. Prefer photos of the actual tenant restaurants. If a screen must be shown, show it **in a hand, at a table** — the context is the point.

---

# Part 11 — Objections & Answers

| They say | You answer |
|---|---|
| *"My customers are already on the delivery apps."* | Keep them. This isn't either/or on day one. Everyone who already knows you — QR at the table, your regulars, your reservations — comes through here at 0% commission. The aggregator becomes acquisition; this becomes retention. |
| *"I don't have time to learn software."* | Your team touches three screens: the order list, the kitchen screen, the menu toggle. Everything else is optional. We load your menu and train your staff before you go live. |
| *"My staff isn't technical."* | Each role sees only its own screen. A cook sees tickets, not analytics. There is nothing on their screen for them to break. |
| *"Who owns my data?"* | You do. It's isolated per restaurant at the database level, and it exports to a spreadsheet in one click, any day, including the day you leave. |
| *"Can another restaurant see my prices or customers?"* | No — and that's enforced by the database, not by our code. A row that isn't yours is invisible to your session. It's the same mechanism banks use for tenant isolation. |
| *"What if the internet goes down?"* | The site is hosted on global infrastructure with automatic failover, so the customer-facing side stays up. On-site, orders are served from any phone or tablet with a connection — there's no server in your kitchen to fail. |
| *"Can I take card payments online?"* | Today: cash and card **on delivery**, fully tracked and reconciled. Online card payment is built to plug in and is waiting on Moroccan merchant onboarding — we'll switch it on for you when it clears. **(Say exactly this. Do not promise a date.)** |
| *"Do you do WhatsApp confirmations?"* | Today, one tap opens WhatsApp to message the guest, and every order is already in your database — not trapped in a chat. Automated messaging is next on the roadmap. |
| *"Is it in Arabic?"* | French and English are live end-to-end today, including the menu content itself. The system stores content per language, so adding Arabic is data entry, not redevelopment. |
| *"How long to go live?"* | The platform exists. The work is your menu, your photos and your brand — that's the timeline, and it's measured in days, not months. |
| *"What if I want to leave?"* | Export your customers and your data. It's a normal spreadsheet. No lock-in clause, no hostage. That's the whole point of the product. |

---

# Part 12 — Roadmap (only show if asked)

Frame as **"next", never as "missing"**.

| Next | What it unlocks |
|---|---|
| **Online card payment (CMI)** | Paid before the driver leaves. Externally gated on Moroccan merchant onboarding. |
| **WhatsApp transactional messaging** | Automatic order confirmation and receipts on the channel Morocco actually uses. |
| **WhatsApp broadcast** | One click to message your customer list — fill a quiet Tuesday. Requires opt-out handling. |
| **Loyalty / digital stamp card** | Invisible visit counter on the phone number; automatic reward at the Nth order. |
| **Catering / bulk pre-order** | Minimum order value + lead time — high-margin tickets an aggregator can't serve. |
| **Arabic & Spanish + RTL** | The tourist and local promise, completed. |
| **Template engine v2** | Faster, fully brand-isolated site generation for each new tenant. |

---

# Part 13 — Fact Ledger (⚠️ read before writing any slide)

## ✅ Shipped and demoable today
Public branded site (7 pages) · Site Builder with themes, fonts, hero images, gallery, section order/copy, draft→publish · dine-in QR ordering with invisible table binding · delivery/takeaway with name+phone+address capture · reservations · events + private inquiries · gift/promo-code redemption page · promo codes CRUD with server-side validation · promotions engine · live orders with realtime push, sound alert and unread tracking · KDS with station routing · POS staff order entry · payment method/status + reconciliation (cash, card on delivery) · inventory with suppliers, deliveries and variances · recipes, plate costing, margin view and auto-86 · floor plan, table sessions, turnover, printable QR cards · 4-role RBAC enforced at 4 layers · staff invite + forced password change · labor clock-in/out with hourly cost · customers with search, order history and one-click CSV export · analytics (revenue, orders, top items, hourly) · Super Admin (restaurants CRUD, per-restaurant feature flags, subscriptions/trials/suspension, audit log, franchise tree) · FR ⇄ EN on the public site and on menu content · rate limiting, secret scanning, RLS isolation, CI with unit + e2e (RBAC / i18n / accessibility) tests.

## 🟡 Partial — usable, don't headline it
- **Dashboard interface translation:** most of the back-office is FR/EN; a few screens are still French-only. The customer-facing site is fully bilingual.
- **Super Admin interface translation:** mostly French — internal tool, not client-facing, doesn't matter for the pitch.
- **Performance numbers:** the budgets and CI pipeline exist, but no published Lighthouse score has been captured yet. → **Never quote a performance score on a slide.** Say "fast on mobile", show it live.

## ❌ Not built — never imply it exists
Online card payment (CMI) · WhatsApp API messaging, confirmations or broadcasts · loyalty / stamp card · catering / bulk pre-order · AI WhatsApp ordering bot · Arabic and Spanish locales · per-language URLs.

## 🔤 Naming note
The repository is `darna`; the platform is referred to as **Ultra System** in the strategy documents. **Pick one name before the deck is designed** and use it everywhere — a deck that switches names mid-way reads as unfinished.

## 🧪 Live proof tenants
- `/orendezvous` — the full-content reference tenant (menu, images, FR+EN content).
- `/arabesque` — the second tenant, proving that a new restaurant is a configuration, not a rebuild. **Use both, side by side, on slide S15.**

---

# Part 14 — Copy Bank (EN / FR)

## 14.1 Headlines
| EN | FR |
|---|---|
| Your restaurant. Your customers. Your data. | Votre restaurant. Vos clients. Vos données. |
| Stop renting your customers. | Arrêtez de louer vos clients. |
| Every order. Every number. Yours. | Chaque commande. Chaque numéro. À vous. |
| One flat fee. No cut of your sales. | Un forfait fixe. Aucune commission sur vos ventes. |
| The invisible waiter. | Le serveur invisible. |
| Your brand, not a listing. | Votre marque, pas une simple annonce. |

## 14.2 Sub-lines
| EN | FR |
|---|---|
| Ordering, reservations and operations — on one platform you actually own. | Commandes, réservations et gestion — sur une plateforme qui vous appartient vraiment. |
| No app to download. It opens in one scan. | Aucune application à télécharger. Un scan et c'est ouvert. |
| Your customer list, exportable in one click. | Votre fichier clients, exportable en un clic. |
| Your driver. Your margin. Your relationship. | Votre livreur. Votre marge. Votre relation client. |

## 14.3 Feature one-liners (poster / card use)
| Feature | EN | FR |
|---|---|---|
| QR dine-in | Scan the table, order in 30 seconds. | Scannez la table, commandez en 30 secondes. |
| Menu editor | Change a price from your phone. Free, instantly. | Changez un prix depuis votre téléphone. Gratuit, immédiat. |
| KDS | Tickets that route themselves to the right station. | Des tickets qui vont d'eux-mêmes au bon poste. |
| Auto-86 | Out of an ingredient? The dish disappears by itself. | Plus d'ingrédient ? Le plat disparaît tout seul. |
| Costing | Know the margin on every plate. | Connaissez la marge de chaque assiette. |
| Reconciliation | Served and paid are not the same thing. | Servi et payé, ce n'est pas la même chose. |
| CSV export | Your customer list, in one click. | Votre fichier clients, en un clic. |
| Roles | The right screen for the right person. | Le bon écran pour la bonne personne. |
| Analytics | Which dish, which hour, which day. | Quel plat, quelle heure, quel jour. |

## 14.4 CTAs
| EN | FR |
|---|---|
| Book a demo | Réserver une démo |
| See it on your menu | Voyez-le avec votre carte |
| Put your restaurant on it | Mettez-y votre restaurant |

## 14.5 Words to avoid
"Solution", "leverage", "synergy", "révolutionnaire", "unique en son genre", "ERP", "SaaS", "multi-tenant", "RLS", "stack". The client is a restaurateur — talk about plates, tables, service, cash and customers. Keep the technical vocabulary in Part 6.2, for the one meeting where someone asks.

---

# Part 15 — Build Checklist for Claude Design

**Deck (18 slides)** — source: Part 8. Design direction: Part 10.
- [ ] Lock the product name (Part 13 naming note)
- [ ] Fill in real prices in the Part 5 matrix
- [ ] Capture fresh screenshots: menu on a phone, KDS, reconciliation, customers + export, two tenant homepages side by side
- [ ] Build S9 (the service loop) first — it's the centerpiece and everything else is trimmed around it
- [ ] Pass every slide against the 6-word headline rule
- [ ] Verify no Part-13 ❌ item leaked onto a slide

**Poster** — source: Part 9, copy from Part 14.
- [ ] Pick one concept (A recommended)
- [ ] Headline readable at 3 meters
- [ ] Exactly 3 stats from Part 7
- [ ] One CTA + QR code to a live demo tenant
- [ ] Produce A2 (print) and 1080×1350 (social) from the same layout
