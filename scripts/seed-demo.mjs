// Demo seeder — fills the DB with realistic data so both the Super Admin panel
// and a restaurant owner's dashboard look "alive".
//
//   node scripts/seed-demo.mjs
//
// Safe to re-run: it deletes the sample tenant rows (orders/customers/
// reservations/tables) for the seed restaurants first, then reinserts, and
// upserts the restaurants + subscriptions. Uses the service-role key (bypasses
// RLS) from .env — never ship this key to the browser.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith("placeholder")) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or a real SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// --- ids -------------------------------------------------------------------
const TACOS = "11111111-1111-1111-1111-111111111111"; // owner: hamza@gmail.com
const DAR_LAHWA = "11111111-1111-1111-1111-111111111112";
const PIZZA_RIF = "11111111-1111-1111-1111-111111111113";
const SUSHI_BAY = "11111111-1111-1111-1111-111111111114";
const CAFE_ATLAS = "11111111-1111-1111-1111-111111111115";
const OTHERS = [DAR_LAHWA, PIZZA_RIF, SUSHI_BAY, CAFE_ATLAS];
const ALL = [TACOS, ...OTHERS];

// --- helpers ---------------------------------------------------------------
const DAY = 86_400_000;
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const iso = (daysAgo, hour = 12, min = 0) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};
async function run(label, promise) {
  const { error } = await promise;
  if (error) console.error(`  ✗ ${label}: ${error.message}`);
  else console.log(`  ✓ ${label}`);
}

// Real Tacos Al Amin menu (from DB) used to build believable order lines.
const MENU = [
  { id: "4b16c69c-a504-40f7-8626-9ab7c67bb051", name: "Tacos Poulet", price: 35 },
  { id: "de02d514-0781-4ea6-bffd-1c7bc1b9cf2b", name: "Tacos Mixte", price: 45 },
  { id: "64a69528-98d6-4f85-8645-f2197afb82aa", name: "Burger Classic", price: 40 },
  { id: "89945345-d08d-4e70-a98f-35beaa1ba704", name: "Burger Double", price: 55 },
  { id: "0f69c866-6891-4e12-b129-73f36b9fd624", name: "Coca-Cola 33cl", price: 8 },
  { id: "baad4940-e699-493d-9818-d1d4096025a8", name: "Eau minérale 50cl", price: 5 },
];
// Popular items get picked more often, so the "Top items" chart has a shape.
const WEIGHTED = [0, 0, 0, 1, 1, 2, 3, 4, 5];
const PEAK_HOURS = [12, 13, 13, 14, 19, 20, 20, 21, 21, 22]; // lunch + dinner

function buildOrderLines() {
  const count = 1 + rand(3);
  const lines = [];
  let subtotal = 0;
  for (let i = 0; i < count; i++) {
    const m = MENU[pick(WEIGHTED)];
    const qty = 1 + rand(2);
    subtotal += m.price * qty;
    lines.push({ item_id: m.id, name: m.name, quantity: qty, unit_price: m.price, options: [] });
  }
  return { lines, subtotal };
}

async function seedRestaurantsAndSubscriptions() {
  console.log("Restaurants + subscriptions (upsert):");
  const restaurants = [
    { id: TACOS, slug: "tacos-al-amin", name: "Tacos Al Amin", whatsapp_number: "212600000000",
      phone: "+212 5 39 00 00 00", address: "Avenue Mohammed VI, Tanger", hours: "Lun–Dim · 11h00 – 23h00",
      currency: "MAD", base_delivery_fee: 15, about_text: "Les meilleurs tacos de Tanger depuis 2015.",
      plan: "pro", status: "active", city: "Tanger" },
    { id: DAR_LAHWA, slug: "dar-lahwa", name: "Dar Lahwa", whatsapp_number: "212600000001",
      phone: "+212 5 39 00 00 01", address: "Boulevard Pasteur, Tanger", hours: "Lun–Dim · 12h00 – 00h00",
      currency: "MAD", base_delivery_fee: 12, about_text: "Cuisine marocaine traditionnelle.",
      plan: "free", status: "trial", city: "Tanger" },
    { id: PIZZA_RIF, slug: "pizza-rif", name: "Pizza Rif", whatsapp_number: "212600000002",
      phone: "+212 5 39 00 00 02", address: "Avenue Hassan II, Tétouan", hours: "Lun–Dim · 11h00 – 23h30",
      currency: "MAD", base_delivery_fee: 10, about_text: "Pizzas au feu de bois.",
      plan: "enterprise", status: "active", city: "Tétouan" },
    { id: SUSHI_BAY, slug: "sushi-bay", name: "Sushi Bay", whatsapp_number: "212600000003",
      phone: "+212 5 39 00 00 03", address: "Marina, Tanger", hours: "Mar–Dim · 18h00 – 23h00",
      currency: "MAD", base_delivery_fee: 20, about_text: "Sushi avec vue sur la baie.",
      plan: "pro", status: "suspended", city: "Tanger" },
    { id: CAFE_ATLAS, slug: "cafe-atlas", name: "Café Atlas", whatsapp_number: "212600000004",
      phone: "+212 5 39 00 00 04", address: "Centre-ville, Rabat", hours: "Lun–Dim · 07h00 – 22h00",
      currency: "MAD", base_delivery_fee: 0, about_text: "Café et petite restauration.",
      plan: "free", status: "expired", city: "Rabat" },
  ];
  await run(`${restaurants.length} restaurants`, db.from("restaurants").upsert(restaurants, { onConflict: "id" }));

  const subs = [
    { restaurant_id: TACOS, plan_tier: "pro", status: "active", billing_cycle: "monthly", price_mad: 499, current_period_end: iso(-20), provider: "manual", notes: "Payé en espèces — juillet 2026" },
    { restaurant_id: DAR_LAHWA, plan_tier: "free", status: "trialing", billing_cycle: "monthly", price_mad: 0, trial_ends_at: iso(-10), provider: "manual" },
    { restaurant_id: PIZZA_RIF, plan_tier: "enterprise", status: "active", billing_cycle: "yearly", price_mad: 12000, current_period_end: iso(-200), provider: "manual", notes: "Facture annuelle par virement" },
    { restaurant_id: SUSHI_BAY, plan_tier: "pro", status: "past_due", billing_cycle: "monthly", price_mad: 499, current_period_end: iso(5), provider: "manual", notes: "Paiement en retard — suspendu" },
    { restaurant_id: CAFE_ATLAS, plan_tier: "free", status: "canceled", billing_cycle: "monthly", price_mad: 0, trial_ends_at: iso(30), provider: "manual", notes: "Essai expiré, non converti" },
  ];
  await run(`${subs.length} subscriptions`, db.from("subscriptions").upsert(subs, { onConflict: "restaurant_id" }));
}

async function wipe() {
  console.log("Clearing previous demo data for seed restaurants…");
  // orders first (customer_id FK is ON DELETE SET NULL, but clear together)
  await run("orders", db.from("orders").delete().in("restaurant_id", ALL));
  await run("reservations", db.from("reservations").delete().in("restaurant_id", ALL));
  await run("customers", db.from("customers").delete().in("restaurant_id", ALL));
  await run("tables", db.from("tables").delete().in("restaurant_id", ALL));
}

async function seedTacosOwner() {
  console.log("\nOwner dashboard — Tacos Al Amin:");

  // Tables (floor plan)
  const tables = Array.from({ length: 8 }, (_, i) => ({
    restaurant_id: TACOS,
    number: String(i + 1),
    seats: [2, 2, 4, 4, 4, 6, 6, 8][i],
    pos_x: 0.15 + (i % 4) * 0.23,
    pos_y: i < 4 ? 0.28 : 0.66,
  }));
  await run(`${tables.length} tables`, db.from("tables").insert(tables));

  // Customers — mix of "new" (first_seen within 30d) and "returning" (older)
  const names = [
    ["Youssef El Amrani", "212661000001"], ["Salma Bennani", "212661000002"],
    ["Karim Tazi", "212661000003"], ["Nadia Alaoui", "212661000004"],
    ["Omar Fassi", "212661000005"], ["Imane Chraibi", "212661000006"],
    ["Rachid Idrissi", "212661000007"], ["Hafsa Berrada", "212661000008"],
    ["Mehdi Ouazzani", "212661000009"], ["Sanaa Kettani", "212661000010"],
  ];
  const customers = names.map(([name, phone], i) => ({
    id: `c1111111-0000-0000-0000-0000000000${String(i + 10).slice(-2)}`,
    restaurant_id: TACOS,
    name,
    phone,
    first_seen: iso(i < 6 ? 5 + rand(20) : 40 + rand(120)), // 6 new, 4 returning
    order_count: 1 + rand(6),
    last_order: iso(rand(10)),
  }));
  await run(`${customers.length} customers`, db.from("customers").insert(customers));

  // Orders — 60 over the last 30 days
  const orders = [];
  for (let i = 0; i < 60; i++) {
    const daysAgo = rand(30);
    const isDelivery = Math.random() < 0.4;
    const { lines, subtotal } = buildOrderLines();
    const deliveryFee = isDelivery ? 15 : 0;
    // recent orders are still active; older ones are done
    const status = daysAgo === 0 ? pick(["new", "preparing"]) : daysAgo <= 1 ? pick(["preparing", "done", "done"]) : "done";
    const cust = isDelivery ? pick(customers) : null;
    orders.push({
      restaurant_id: TACOS,
      type: isDelivery ? "delivery" : "dine_in",
      table_number: isDelivery ? null : String(1 + rand(8)),
      customer_id: cust?.id ?? null,
      customer_name: cust?.name ?? null,
      address: isDelivery ? "Quartier Iberia, Tanger" : null,
      note: Math.random() < 0.2 ? "Sans oignon" : null,
      items: lines,
      subtotal,
      delivery_fee: deliveryFee,
      total: subtotal + deliveryFee,
      status,
      created_at: iso(daysAgo, pick(PEAK_HOURS), rand(60)),
    });
  }
  await run(`${orders.length} orders`, db.from("orders").insert(orders));

  // Reservations — past + upcoming, varied statuses
  const resNames = [
    ["Familie Bennani", "212662000001"], ["Table Amrani", "212662000002"],
    ["Groupe Tazi", "212662000003"], ["M. Fassi", "212662000004"],
    ["Mme Alaoui", "212662000005"], ["Anniversaire Omar", "212662000006"],
    ["Réunion Idrissi", "212662000007"], ["Couple Berrada", "212662000008"],
    ["Déjeuner Kettani", "212662000009"], ["Dîner Ouazzani", "212662000010"],
    ["Groupe Chraibi", "212662000011"], ["Table Sekkat", "212662000012"],
  ];
  const reservations = resNames.map(([name, phone], i) => {
    const offset = i - 4; // -4..+7 days relative to today
    const d = new Date(Date.now() + offset * DAY);
    const status = offset < 0 ? "confirmed" : i % 5 === 0 ? "declined" : offset === 0 ? "confirmed" : "new";
    return {
      restaurant_id: TACOS,
      customer_name: name,
      customer_phone: phone,
      date: d.toISOString().slice(0, 10),
      time: `${19 + (i % 3)}:${i % 2 ? "30" : "00"}:00`,
      party_size: 2 + rand(8),
      note: i % 3 === 0 ? "Près de la fenêtre" : null,
      status,
      assigned_table_number: status === "confirmed" ? String(1 + rand(8)) : null,
    };
  });
  await run(`${reservations.length} reservations`, db.from("reservations").insert(reservations));
}

async function seedOtherRestaurants() {
  console.log("\nAdmin panel — other restaurants' orders:");
  const rows = [];
  for (const rid of OTHERS) {
    const n = 15 + rand(15);
    for (let i = 0; i < n; i++) {
      const { lines, subtotal } = buildOrderLines();
      const isDelivery = Math.random() < 0.4;
      const fee = isDelivery ? 12 : 0;
      rows.push({
        restaurant_id: rid,
        type: isDelivery ? "delivery" : "dine_in",
        table_number: isDelivery ? null : String(1 + rand(6)),
        items: lines,
        subtotal,
        delivery_fee: fee,
        total: subtotal + fee,
        status: "done",
        created_at: iso(rand(30), pick(PEAK_HOURS), rand(60)),
      });
    }
  }
  await run(`${rows.length} orders across 4 restaurants`, db.from("orders").insert(rows));
}

async function seedFeatureOverrides() {
  console.log("\nAdmin panel — feature overrides (permissions page):");
  const rows = [
    { restaurant_id: SUSHI_BAY, feature_key: "online_ordering", enabled: false },
    { restaurant_id: CAFE_ATLAS, feature_key: "reservations", enabled: false },
    { restaurant_id: DAR_LAHWA, feature_key: "analytics", enabled: true },
  ];
  await run(`${rows.length} feature overrides`, db.from("restaurant_features").upsert(rows, { onConflict: "restaurant_id,feature_key" }));
}

async function main() {
  console.log("Seeding demo data → " + url);
  await seedRestaurantsAndSubscriptions();
  await wipe();
  await seedTacosOwner();
  await seedOtherRestaurants();
  await seedFeatureOverrides();

  // summary
  console.log("\nCounts:");
  for (const t of ["orders", "customers", "reservations", "tables"]) {
    const { count } = await db.from(t).select("*", { count: "exact", head: true }).eq("restaurant_id", TACOS);
    console.log(`  ${t} (Tacos Al Amin): ${count ?? 0}`);
  }
  const { count: allOrders } = await db.from("orders").select("*", { count: "exact", head: true });
  console.log(`  orders (all restaurants): ${allOrders ?? 0}`);
  console.log("\nDone. Log in as hamza@gmail.com (owner) or admin@gmail.com (admin).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
