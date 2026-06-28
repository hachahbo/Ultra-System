# Direct Ordering MVP

## **MVP Goal**
Allow **local restaurants in Morocco** to bypass third-party delivery apps like Glovo by providing a lightning-fast, mobile-optimized direct ordering web app. Customers order directly via a WhatsApp URL generator, saving money on app fees while increasing restaurant margins.

---

## 🧱 **Core MVP Features**

### 1️⃣ **Multi-Tenant Architecture**
✅ Expo Router handles dynamic slugs (`app.domain.ma/[restaurantSlug]`).
✅ Fetches menu from Airtable based on the URL slug.
✅ Supports custom URL parameters for "In-House" QR Table Menus (`?table=X`).

### 2️⃣ **Data Fetching (Serverless)**
✅ Reads a JSON payload from Airtable API (Restaurants, Categories, Items, Modifiers).
✅ Handles item stock status toggled by restaurant owners on their phones.
🚫 No custom Node.js/Express backend required for V1.0.

### 3️⃣ **State Management (Zustand)**
✅ Manages the shopping cart cleanly.
✅ Tracks active restaurant context and table ID.
✅ Calculates running totals without redundant UI re-renders.

### 4️⃣ **The WhatsApp Engine**
✅ Checkout compiles the cart into a robust URL-encoded string.
✅ Triggers a native deep link to WhatsApp (`https://wa.me/{number}?text={encoded_order}`).
✅ Handles edge cases: missing modifiers, empty carts, or missing table numbers.

### 5️⃣ **Mobile-First UI**
✅ Built strictly for mobile web browsers (Safari/Chrome via QR code scan).
✅ Uses Expo Web compatible components (`lucide-react-native`).
✅ Clean separation of UI components from state logic.

---

## 🚫 **NOT Included in MVP (Phase 2 or 3)**
⛔ Native App compilation (iOS/Android App Store release).
⛔ Traditional Payment Gateways (Stripe / CMI). MVP uses Cash on Delivery (COD) / Direct WhatsApp payment negotiation.
⛔ Complex Express/Laravel Backends.
⛔ Advanced User Authentication (Login/Register). The user simply checks out via WhatsApp.

These features will come **after the MVP confirms demand** and restaurant adoption.

---

## 🛠️ **Tech Stack for MVP**

| Feature | Choice |
| --- | --- |
| Framework | Expo (React Native for Web) via Expo Router |
| State Management | Zustand |
| Database | Static `menu.json` / Airtable REST API |
| Checkout | WhatsApp Deep Link Generator |
| Styling | React Native StyleSheet / Minimal Tailwind |
| Deployment | Vercel (Edge network) |

---

## 🔥 Main MVP Success Metrics

| KPI | Target |
| --- | --- |
| Proof of Concept | App correctly fetches Airtable data by slug |
| Checkout Speed | Under 60 seconds from scan to WhatsApp message |
| Adoption | Successfully piloted in 1-2 Tangier restaurants |