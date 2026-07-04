# Darna — Direct ordering & reservations (Tangier pilot)

Per-restaurant branded site with ordering (dine-in QR + delivery) and table
reservations. Every order and reservation — **with the customer's phone
number** — lands in a database the restaurant owns, plus an authenticated
owner dashboard. Build spec: [.claude/plan.md](.claude/plan.md).

## Stack

Next.js (App Router) + TypeScript · Tailwind CSS v4 + shadcn/ui ·
react-hook-form + zod · TanStack Query · Supabase (Postgres, Auth, RLS,
Storage) · Vercel.

## Setup

1. **Supabase project** — create one at supabase.com.
2. **Schema** — in the SQL editor, run `supabase/migrations/0001_init.sql`,
   then `supabase/seed.sql` (pilot restaurant `tacos-al-amin`).
3. **Env** — `cp .env.example .env.local` and fill in the URL, anon key and
   service-role key (Project Settings → API). The service-role key is
   server-only; never prefix it with `NEXT_PUBLIC_`.
4. **Create the owner account** — Supabase Dashboard → Authentication → Add
   user (email + password), then bind it to the restaurant:

   ```sql
   insert into public.profiles (id, restaurant_id, role)
   values ('<auth-user-uuid>', '11111111-1111-1111-1111-111111111111', 'owner');
   ```

5. `npm install && npm run dev`

## URLs

| Route | What |
|---|---|
| `/tacos-al-amin` | Public site (home, `/menu`, `/reservation`, `/contact`, `/about`) |
| `/tacos-al-amin/menu?table=5` | Dine-in QR entry — order without phone, table 5 attached |
| `/login` | Owner/staff login |
| `/dashboard` | Kitchen view (auto-refresh) · `/reservations` · `/menu` · `/customers` (CSV export, owner only) |

## Architecture notes

- **Tenant isolation is enforced by RLS**, not app code. A logged-in owner
  can only read/write rows with their own `restaurant_id` (see
  `supabase/migrations/0001_init.sql`).
- Public menu reads use the anon key and are cached ~60s (`src/lib/menu.ts`).
- Public writes (orders, reservations) go through `/api/orders` and
  `/api/reservations`: zod-validated, prices recomputed server-side from the
  DB, service-role client scoped to the slug's restaurant.
- Dashboard reads/writes go through session-authenticated route handlers
  under `/api/dashboard/*`; RLS applies to every query.
- `src/proxy.ts` refreshes the Supabase session and protects `/dashboard`.

## Table QR codes

Print QR codes pointing to
`https://<domain>/<slug>/menu?table=<n>` — one per table.
