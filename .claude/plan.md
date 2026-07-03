# Direct Ordering Web App — v1 Build Spec (Tangier Pilot)

> This is the **build document** for Claude Code.
> Scope is deliberate. Everything in the PARKED list was cut on purpose — do not add it back.

---

## 0. Note to the coding agent (read first)

- Build **only** what is in "IN SCOPE (v1)" (§3). Do not build anything in "PARKED" (§4) — no scaffolding, no hooks, no "just in case." Ask before adding anything not listed.
- Goal of v1: **one Tangier restaurant using this daily.** Optimize for shippable and simple, not future scale.
- **Never put any secret (database service key, auth secret, WhatsApp token) in client-side code.** Secrets live server-side only (§6, §8).
- This is **multi-tenant**: restaurant A must never be able to see restaurant B's orders, customers, or reservations. Tenant isolation is a hard requirement (§8).

---

## 1. What this is (one line)

A per-restaurant branded website with ordering (dine-in + delivery) and table reservations, that saves every order and reservation — **with the customer's phone number** — into a database the restaurant owns, plus an authenticated owner dashboard to run it all.

## 2. The single core value (never lose sight of this)

Glovo hides the customer's name and phone number from the restaurant. This product exists to **capture the customer's phone number into an exportable list the restaurant owns.** Everything else is packaging around that.

> ⚠️ Design trap: an order/reservation that lives **only** as a WhatsApp message is NOT captured — the number is trapped in chat history, which is the exact "data hostage" problem we're beating. **Every order and reservation must be written to the database. WhatsApp, if used, is only a notification on top.**

---

## 3. IN SCOPE (v1) — build exactly this

### A. The public per-restaurant website
Each restaurant gets a branded site at a slug path: `app.domain.ma/tacos-al-amin`, with these pages:

1. **Home** — hero, restaurant name/logo, quick links to Menu / Reservation / Order, hours, location.
2. **Menu** — categories, items, prices, photos, out-of-stock respected. Ordering happens here.
3. **Reservation** — book a table (see flow below).
4. **Contact Us** — address, phone, WhatsApp link, map embed, opening hours.
5. **Who We Are (About)** — short story/description + photos.

Responsive, mobile-first, no download. Default language **French**, with an Arabic toggle if cheap (keep RTL in mind).

### B. Dine-in ordering (QR at table)
- Table QR encodes `?table=5`; app attaches table id to the order.
- **No phone required** (customer is seated).
- Order → database → appears on kitchen view with table number.

### C. Delivery / takeaway ordering
- Customer enters **name + phone + address** (phone & address required — this is the capture).
- Order → database. Payment = **cash on delivery only** in v1.
- The **restaurant's own driver** delivers. We do NOT arrange couriers.

### D. Table reservation
- Customer picks **date, time, party size**, enters **name + phone** (+ optional note).
- Reservation → database → shows in the owner dashboard. Status: `new → confirmed / declined`.
- Confirmation is **manual** in v1 (owner confirms in dashboard; optional `wa.me` tap to message the guest). No automated messaging.

### E. Authenticated owner dashboard
Login-protected. Owner (and staff) can:
- **Orders / kitchen view** — live incoming orders, newest first, auto-refresh, "new order" signal, mark `done`.
- **Reservations** — see/confirm/decline upcoming bookings.
- **Menu management** — add/edit items & categories, set prices, upload photos, **toggle in-stock** — all from their phone.
- **Customers** — full list (name, phone, order count, last order) with **one-click CSV export**. This is the payoff — make it obvious.

That's v1. A branded 5-page site + 3 capture flows (order-in, order-out, reserve) + one auth'd dashboard.

---

## 4. PARKED — do NOT build in v1

Not "no forever" — "not until one restaurant uses v1 daily."

- ❌ Owned/managed delivery fleet or courier dispatch
- ❌ Online payments / CMI / cards (v1 is cash only)
- ❌ Native iOS/Android app / Expo
- ❌ Auto-translate / browser-language auto-switch (keep trilingual **data** shape; don't build the switching UI)
- ❌ "Invisible waiter" 2D floor-plan map
- ❌ Automated loyalty / digital stamp card
- ❌ Corporate catering / bulk pre-order mode
- ❌ AI WhatsApp ordering bot
- ❌ Automated WhatsApp confirmations or promo broadcasts (real legal/ban risk — §9)

---

## 5. Tech stack

### Framework & language
- **Next.js (App Router) + React + TypeScript** — one repo serves the public site, the dashboard, and the server API routes. Deploy on **Vercel**.

### UI toolkit (specific tools)
- **Tailwind CSS** — styling.
- **shadcn/ui** — prebuilt, accessible components (built on Radix). Perfect for the dashboard tables, forms, dialogs, and the public forms. Fast to assemble, looks clean by default.
- **lucide-react** — icons.
- **react-hook-form + zod** — all forms (checkout, reservation, menu editor, login) with validation. zod also validates data server-side in the API routes.
- **date-fns** — date/time handling for reservations.
- **TanStack Query (react-query)** — client data fetching/caching for the dashboard and kitchen view (auto-refresh, polling).
- Optional: **@tanstack/react-table** for the customers/orders tables.

### Backend & database — **recommended: Supabase**
Now that v1 includes **authentication + an owner dashboard**, use **Supabase** as the backbone:
- **Postgres** — real relational DB.
- **Supabase Auth** — email/password or magic-link login for owners/staff (solves the auth requirement natively — no extra service).
- **Row-Level Security (RLS)** — enforces multi-tenant isolation at the database level so a logged-in owner can only ever read/write **their own** restaurant's rows. This is the safe way to do multi-tenant; don't rely on filtering in app code alone.
- **Storage** — for menu/item images.

> Why the switch from Airtable: Airtable's only real advantage was letting the owner edit the menu from their phone with no code. Since you're now building a dashboard that does exactly that (with login), Airtable loses its edge and would force you to bolt on a separate auth system. Supabase gives DB + auth + tenant isolation + image storage in one. *(If you insist on Airtable, you'd pair it with Clerk or Auth.js for login and handle isolation manually — more moving parts, not recommended for this shape.)*

---

## 5.5 Front-End design source (Figma)

The public site's visual design lives in Figma. Build the front end to match it.

- **File key:** `xix3eKReKkjtAYbKSNPFGr` · **Page:** "Page 1" · **Main frame:** `HomePage`, node **`1:3`** (desktop, 1512px wide).
- **What's designed:** only the **HomePage** (a long marketing/landing page) with **placeholder content** (Lorem ipsum, sample dishes). The Menu, Reservation, Contact, and About pages are **not designed yet** — derive them from the HomePage's visual language (same nav, colors, type scale, spacing, components).
- **HomePage sections (top → bottom):** sticky nav + "Book a table" CTA → hero ("We provide the best food for you") → "Our Special Dishes" (dish cards with photo + price) → "Welcome to Our Restaurant" (about blurb) → "Our Expert Chef" → "Our Happy Customers" (testimonials) → footer.

**Nav reconciliation (design vs this plan):** the Figma nav reads *Menu · Gallery · About · Contact · Events · Book a table*.
- `Book a table` → **Reservation** flow (§3D).
- `About` → **Who We Are** page.
- `Gallery` → optional simple photo grid (cheap; keep if desired).
- `Events` → **PARK for v1** (implies an events/calendar feature we're not building).

**Two hard front-end requirements the current design doesn't cover yet:**
1. **Mobile-first is mandatory.** The design is desktop-only, but the whole product is scanned from a phone (QR at table / in delivery bag). Every page must be built mobile-first and look right at ~380px before desktop. Don't ship desktop-only.
2. **Exact tokens must come from Figma, not guesses.** Precise hex colors and font families could not be exported here (the Figma Dev Mode export hit the Starter-plan MCP rate limit). Before pixel-perfect build, pull tokens from **Figma Dev Mode** — call `get_design_context` on node `1:3` once the limit resets (or on a paid plan), or read them from the Figma inspect panel. **Do not invent hex values or fonts.**

**Design → code mapping:** build these as reusable components (shadcn/ui + Tailwind): `NavBar` (with Book-a-table CTA), `Hero`, `DishCard` (photo, name, price → links into the ordering flow), `SectionHeading`, `TestimonialCard`, `Footer`. The dish cards and Menu link into the ordering flow (§3B/C); "Book a table" links into the reservation flow (§3D). Content on the live site comes from the DB (§8), not hard-coded placeholders.

---

## 6. Architecture rules

- Client (public site + dashboard) → **Next.js API routes / server actions** → Supabase. Public reads (menu) can use Supabase's anon key with RLS; all writes and all dashboard reads go through authenticated server code.
- **No service-role key in the browser, ever.** Only in server-side code / env vars.
- **Cache the public menu** (revalidate ~30–60s) so a busy public page doesn't hammer the DB.
- Keep order/reservation **status flows minimal**: orders `new → done`; reservations `new → confirmed/declined`.

---

## 7. Authentication & roles (the new requirement)

- **Who logs in:** restaurant owner + optionally their staff. Customers do NOT log in — ordering and reserving stay account-free (zero friction is the whole point).
- **Method:** Supabase Auth, email/password or magic link. Keep it simple.
- **Tenant binding:** each user is linked to exactly one `restaurant_id`. RLS policies key every table off that id.
- **Roles (keep it to two for v1):** `owner` (everything) and `staff` (see orders + reservations, mark done/confirm; cannot edit prices or export customers). Don't build a full role matrix.
- **Protect routes:** everything under `/dashboard` requires a session; unauthenticated users are redirected to `/login`.

---

## 8. Data model (Supabase / Postgres)

All tables carry `restaurant_id` and are protected by RLS.

- `restaurants` — id, slug, name, logo_url, whatsapp_number, phone, address, hours, currency, base_delivery_fee, is_dine_in_enabled, is_delivery_enabled, about_text
- `profiles` — id (=auth user), restaurant_id, role (`owner`|`staff`)
- `categories` — id, restaurant_id, name_fr, name_ar, name_es, sort_order
- `items` — id, restaurant_id, category_id, name_fr, name_ar, name_es, base_price, image_url, **in_stock (bool)**, sort_order, customization_groups (jsonb)
- `customers` — id, restaurant_id, name, **phone (the asset)**, first_seen, order_count, last_order
- `orders` — id, restaurant_id, type (`dine_in`|`delivery`), table_number, customer_id, items (jsonb), total, delivery_fee, status (`new`|`done`), created_at
- `reservations` — id, restaurant_id, customer_name, customer_phone, date, time, party_size, note, status (`new`|`confirmed`|`declined`), created_at

Menu is served to the public site as JSON; names stay as language objects so the trilingual option remains free later **without a schema change**, even though auto-switch is parked:

```json
{
  "restaurant": { "slug": "tacos-al-amin", "name": "Tacos Al Amin", "currency": "MAD", "base_delivery_fee": 15.0, "is_dine_in_enabled": true, "is_delivery_enabled": true },
  "categories": [ { "id": "cat_1", "name": { "fr": "Tacos", "ar": "تاكوس", "es": "Tacos" } } ],
  "items": [
    {
      "id": "item_101", "category_id": "cat_1",
      "name": { "fr": "Tacos Mixte", "ar": "تاكوس مشكل", "es": "Tacos Mixto" },
      "base_price": 45.0, "image_url": "https://.../tacos.jpg", "in_stock": true,
      "customization_groups": [
        { "title": { "fr": "Choix de Sauce", "ar": "صلصة" }, "required": true, "max_selections": 2,
          "options": [ { "name": "Algérienne", "price_modifier": 0 }, { "name": "Fromage Fondant", "price_modifier": 2.0 } ] }
      ]
    }
  ]
}
```

---

## 9. Gotchas to get right

- **"Sync to POS" is fiction.** Small Tangier restaurants have no digital POS. The dashboard kitchen view **is** their POS. Integrate nothing.
- **WhatsApp is harder than it looks.** Automated confirmations and especially promo broadcasts need the official WhatsApp Business (Cloud) API, a verified number, pre-approved templates, and opt-in; unofficial blasting gets numbers **banned**. So v1 has **no automated WhatsApp** — kitchen/reservation pings are either the auto-refreshing dashboard or a manual `wa.me` tap. Broadcasts stay parked.
- **Reservation double-booking / capacity:** v1 does NOT need a real table-availability engine. Just collect the booking and let the owner confirm/decline manually. Don't build seat-map capacity logic.
- **Multi-tenant isolation is a security issue, not a convenience.** Get RLS right early; test that one restaurant's login cannot read another's data.
- **Images:** use Supabase Storage; compress on upload. Don't over-engineer.
- **Correct your numbers:** Glovo's Morocco commission is **capped at 30%** (Competition Council settlement, 2025) and exclusivity clauses were removed — so restaurants can legally run your direct channel alongside Glovo. Use "up to 30%," not "25–35%," in any pitch material.

---

## 10. Suggested build order (milestones)

1. **M1 — Public menu renders** from DB for one restaurant (`/tacos-al-amin/menu`), respecting `in_stock`.
2. **M2 — Delivery order writes to DB** (name/phone/address → `orders` + upsert `customers`). **Verify the phone lands in the DB.** This milestone *is* the product — prove it first.
3. **M3 — Auth + dashboard shell** (login, protected `/dashboard`, RLS tenant isolation working).
4. **M4 — Dashboard: orders/kitchen view** (live list, auto-refresh, mark done) + **Customers + CSV export**.
5. **M5 — Dine-in QR** (`?table=`, no phone, table on kitchen view).
6. **M6 — Reservation flow** (public form → `reservations` → dashboard confirm/decline).
7. **M7 — Menu management in dashboard** (edit items/prices/photos, toggle stock).
8. **M8 — Site pages + design polish.** Build Home to match the Figma HomePage (node `1:3`); derive Menu, Reservation, Contact, and About from its visual language. **Pull exact color/font tokens from Figma Dev Mode first** (§5.5) and set them as Tailwind theme tokens before styling. Everything **mobile-first**. Park the Events nav item; Gallery optional.

Ship **M1–M2 to a real owner before building the rest.** If phone numbers aren't landing, nothing else matters.

---

## 11. Non-technical risks (these decide success, not the code)

- **The flyer depends on the owner.** The "convert Glovo customers" loop only works if staff drop the "scan for 10% off, real prices" flyer into every Glovo bag. Ship printed flyers + a one-line staff script, not just software.
- **You are not first.** OCHI (ochi.ma) already ships a fuller version across Morocco with a free tier around 290 MAD/month. Your edge is **not features** — it's being physically in Tangier, in Darija, setting it up by hand. Compete on local presence.
- **Data protection (Law 09-08 / CNDP):** you store names + phone numbers. Collect only what's needed, make it clearly the **restaurant's** data, keep the export button. Right pitch and right legal posture.

---

## 12. Open questions to lock before/while building

1. **SaaS-for-many or run-it-for-a-few?** v1 is the same either way; it changes what comes after M8.
2. **Does your first target restaurant have its own delivery driver?** If not, they're the wrong first customer.
3. **Staff logins in v1, or just the owner?** (Defaults to owner-only if unsure — simpler.)
4. **Pricing to the owner:** recommend a **free first month**, then flat monthly (~300 MAD). Free pilot removes risk and forces the real test — does the flyer get used.