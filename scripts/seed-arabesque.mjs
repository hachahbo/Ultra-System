// Arabesque tenant seeder — creates the restaurant + its owner login, mirroring
// the Super Admin create flow in src/app/api/admin/restaurants/route.ts
// (restaurant → restaurant_theme → subscription → auth user → owner profile,
// with rollback on failure).
//
//   node scripts/seed-arabesque.mjs
//
// Safe to re-run: existing rows are upserted and an existing auth user is
// reused rather than duplicated. Uses the service-role key (bypasses RLS)
// from .env — never ship this key to the browser.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith("placeholder")) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or a real SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const RESTAURANT = {
  slug: "arabesque",
  name: "Arabesque",
  city: "Tanger",
  plan: "pro",
  currency: "MAD",
  phone: "+212 5 39 00 00 05",
  whatsapp_number: "212600000005",
  hours: "Lun–Dim · 12h00 – 23h00",
  base_delivery_fee: 15,
};

const OWNER = { email: "owner@arabesque.ma", password: "Arabesque2026!" };

async function findUserByEmail(email) {
  // No get-by-email in the admin SDK — page through listUsers (small tenant set).
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
  // --- restaurant ----------------------------------------------------------
  const { data: existing } = await db
    .from("restaurants")
    .select("id")
    .eq("slug", RESTAURANT.slug)
    .maybeSingle();

  let restaurantId = existing?.id ?? null;
  if (restaurantId) {
    const { error } = await db.from("restaurants").update(RESTAURANT).eq("id", restaurantId);
    if (error) {
      console.error(`  ✗ restaurant update: ${error.message}`);
      process.exit(1);
    }
    console.log(`  · restaurant already exists, updated: ${RESTAURANT.slug} (${restaurantId})`);
  } else {
    const { data, error } = await db.from("restaurants").insert(RESTAURANT).select("id").single();
    if (error || !data) {
      console.error(`  ✗ restaurant insert: ${error?.message}`);
      process.exit(1);
    }
    restaurantId = data.id;
    console.log(`  ✓ restaurant created: ${RESTAURANT.slug} (${restaurantId})`);
  }

  // --- theme (Site Builder reads/writes this row; every tenant needs one) ---
  const { error: themeError } = await db
    .from("restaurant_theme")
    .upsert(
      {
        restaurant_id: restaurantId,
        hero_image_urls: [
          "/images/arabesque/hero-main.jpg",
          "/images/orendezvous/hero-pop-default.webp",
          "/images/arabesque/hero-main.jpg",
          "/images/orendezvous/hero-pop-default.webp",
          "/images/arabesque/hero-main.jpg",
          "/images/orendezvous/hero-pop-default.webp",
        ],
      },
      { onConflict: "restaurant_id" },
    );
  if (themeError) console.error(`  ✗ restaurant_theme: ${themeError.message}`);
  else console.log("  ✓ restaurant_theme row ready with Arabesque hero image");

  // --- subscription --------------------------------------------------------
  const { error: subError } = await db.from("subscriptions").upsert(
    {
      restaurant_id: restaurantId,
      plan_tier: RESTAURANT.plan,
      status: "active",
      billing_cycle: "monthly",
      price_mad: 499,
      provider: "manual",
    },
    { onConflict: "restaurant_id" },
  );
  if (subError) console.error(`  ✗ subscription: ${subError.message}`);
  else console.log(`  ✓ subscription ready (${RESTAURANT.plan}, active)`);

  // --- owner auth user + profile -------------------------------------------
  let user = await findUserByEmail(OWNER.email);
  if (!user) {
    const { data: created, error: createError } = await db.auth.admin.createUser({
      email: OWNER.email,
      password: OWNER.password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      console.error(`  ✗ auth user ${OWNER.email}: ${createError?.message}`);
      process.exit(1);
    }
    user = created.user;
    console.log(`  ✓ auth user created: ${OWNER.email}`);
  } else {
    const { error: pwError } = await db.auth.admin.updateUserById(user.id, {
      password: OWNER.password,
      email_confirm: true,
    });
    if (pwError) console.error(`  ✗ password reset: ${pwError.message}`);
    else console.log(`  · auth user already existed, password reset: ${OWNER.email}`);
  }

  const { error: profileError } = await db.from("profiles").upsert(
    {
      id: user.id,
      restaurant_id: restaurantId,
      role: "owner",
      active: true,
      must_change_password: true,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    console.error(`  ✗ owner profile: ${profileError.message}`);
    process.exit(1);
  }
  console.log("  ✓ owner profile upserted");

  console.log(`\nArabesque ready — /${RESTAURANT.slug} (public) · login ${OWNER.email}`);
}

main().then(() => process.exit(0));
