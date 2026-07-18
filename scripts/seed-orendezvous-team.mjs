// Ô rendez-vous team seeder — one auth user + profile per non-owner role
// (manager/serveur/cuisine), matching the access matrix in
// src/lib/permissions.ts and the create flow in
// src/app/api/dashboard/staff/route.ts.
//
//   node scripts/seed-orendezvous-team.mjs
//
// Safe to re-run: looks up each seed email first and skips creation if the
// auth user already exists (just fixes up its profile row instead of
// duplicating). Uses the service-role key (bypasses RLS) from .env — never
// ship this key to the browser.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith("placeholder")) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or a real SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const RESTAURANT_ID = "11111111-1111-1111-1111-111111111111"; // orendezvous

const TEAM = [
  { email: "manager@orendezvous.ma", role: "manager", password: "Manager2026!" },
  { email: "serveur@orendezvous.ma", role: "serveur", password: "Serveur2026!" },
  { email: "cuisine@orendezvous.ma", role: "cuisine", password: "Cuisine2026!" },
];

async function findUserByEmail(email) {
  // No get-by-email in the admin SDK — page through listUsers (team is tiny).
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  for (const member of TEAM) {
    let user = await findUserByEmail(member.email);

    if (!user) {
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: member.email,
        password: member.password,
        email_confirm: true,
      });
      if (createError || !created.user) {
        console.error(`  ✗ auth user ${member.email}: ${createError?.message}`);
        continue;
      }
      user = created.user;
      console.log(`  ✓ auth user created: ${member.email}`);
    } else {
      console.log(`  · auth user already exists: ${member.email}`);
    }

    const { error: profileError } = await db.from("profiles").upsert(
      {
        id: user.id,
        restaurant_id: RESTAURANT_ID,
        role: member.role,
        active: true,
        must_change_password: true,
        consented_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (profileError) {
      console.error(`  ✗ profile ${member.email}: ${profileError.message}`);
    } else {
      console.log(`  ✓ profile upserted: ${member.email} (${member.role})`);
    }
  }

  const { data: team } = await db
    .from("profiles")
    .select("id, role, active")
    .eq("restaurant_id", RESTAURANT_ID);
  console.log(`\nTeam for orendezvous (${team?.length ?? 0} profiles):`);
  console.table(team);
}

main().then(() => process.exit(0));
