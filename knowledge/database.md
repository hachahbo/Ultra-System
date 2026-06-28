Here is the exact database strategy and schema for the MVP. We will bypass a heavy database (like PostgreSQL) to maintain extreme speed, but we will upgrade from a static file to a "No-Code" database so restaurant owners can manage their inventory instantly.

### 🛠️ The Technology Choice: Airtable (Highly Recommended) or Google Sheets

For V1.0, we will use **Airtable** (accessed via its standard REST API).

**Why Airtable instead of a real database?**

* **Zero Admin Panel Required:** If a kitchen runs out of avocado during a Friday rush, you do not want them calling you to change the code. Airtable gives the restaurant owner a free app on their phone where they simply uncheck a box that says "In Stock," and the web app updates instantly.
* **Perfect JSON Output:** Airtable's API naturally returns clean JSON that your Expo app can fetch on load, exactly mimicking the `menu.json` structure we discussed.
* **Relational Links:** It handles the connections between "Restaurants", "Categories", and "Items" perfectly.

---

### 🗄️ The Database Schema (Table Structure)

You will create a single Airtable Base (or Google Sheet spreadsheet) with the following interconnected tables.

#### Table 1: `Restaurants`

This handles the multi-tenant architecture. The Expo app reads the URL slug and fetches the corresponding row.

* **`slug` (Primary Key):** e.g., `tacos-al-amin`
* **`restaurant_name`:** "Tacos Al Amin"
* **`whatsapp_number`:** "+2126XXXXXXXX" (Crucial for the checkout generator)
* **`currency`:** "MAD"
* **`delivery_fee`:** 15.00
* **`is_active`:** Checkbox (Boolean)

#### Table 2: `Categories`

This drives the navigation tabs on the frontend UI.

* **`category_id` (Primary Key):** e.g., `cat_1`
* **`restaurant_slug` (Foreign Key):** Links to the Restaurants table.
* **`name_fr`:** "Tacos"
* **`name_ar`:** "تاكوس"
* **`sort_order`:** Number (to control which category appears first).

#### Table 3: `Items`

The core menu items displayed in the product cards.

* **`item_id` (Primary Key):** e.g., `item_101`
* **`category_id` (Foreign Key):** Links to the Categories table.
* **`name_fr`:** "Tacos Mixte"
* **`name_ar`:** "تاكوس مشكل"
* **`base_price`:** 45.00
* **`image_url`:** URL string (Hosted on Cloudinary, Imgur, or direct Airtable attachment).
* **`in_stock`:** Checkbox (Boolean - the owner toggles this on their phone).
* **`has_modifiers`:** Checkbox (Boolean).

#### Table 4: `Modifiers` (Upsells & Add-ons)

This handles the complex ordering logic for the WhatsApp cart.

* **`modifier_id` (Primary Key):** e.g., `mod_1`
* **`item_id` (Foreign Key):** Links to the Items table.
* **`group_name_fr`:** "Choix de Sauce"
* **`option_name_fr`:** "Algérienne"
* **`price_impact`:** 0.00 (or 2.00 if it's an upsell like Extra Cheese).
* **`is_required`:** Checkbox (Boolean).

---

### 🔄 The Data Fetching Flow in Expo

When a user scans the QR code (`app.domain.ma/tacos-al-amin`), your Expo app will execute this logic:

1. Read the `slug` from the URL (`tacos-al-amin`).
2. Send a GET request to the Airtable API, filtering for that specific `slug`.
3. Airtable returns the `Restaurant` details, along with all `Categories`, `Items`, and `Modifiers` linked to it.
4. Zustand stores this JSON payload in the state.
5. The UI renders the localized menu dynamically.

If you pass this schema to Claude, it can immediately write the data-fetching hooks (e.g., `useFetchMenu.ts`) and correctly map the types for the Zustand store.