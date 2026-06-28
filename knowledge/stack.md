Here is the exact MVP tech stack formatted as a clean, machine-readable Markdown document. You can copy this block and paste it directly into Claude or your AI coding agent to set the system architecture and context.

---

# 🏗️ System Architecture & Tech Stack: Direct Ordering MVP (Version 1.0)

## 🎯 Project Context

This is a lightweight, mobile-optimized direct ordering web application for local restaurants. It serves as a "Trojan Horse" MVP to bypass third-party delivery apps. The system uses a multi-tenant URL structure (e.g., `app.domain.ma/[restaurant-slug]`) and bypasses a traditional backend by compiling orders into a formatted WhatsApp string.

## 📦 Core Tech Stack

### 1. Framework & Routing

* **Framework:** Expo (React Native for Web).


* *Constraint:* Must strictly support web compilation via `expo-router`.


* **Routing:** Expo Router (File-based routing).
* *Structure:* Requires dynamic segments to handle multi-tenant routing (`app/[restaurantSlug]/index.tsx`) and capture URL parameters like `?table=`.





### 2. State Management

* **Library:** Zustand.


* *Purpose:* Manage the cart state, track the active restaurant context, parse the `table` ID, and calculate the running totals without redundant re-renders.





### 3. UI & Styling

* **Styling:** React Native `StyleSheet` (Tailwind/NativeWind is optional but keep dependencies low). Adhere strictly to Figma-provided exact hex codes, border radii, and padding values.
* **Icons:** `lucide-react-native`.


* *Constraint:* Ensure proper web compilation configuration in `metro.config.js` or `next.config.js` if necessary for Expo Web.



### 4. Data Layer (Serverless)

* **Initial DB:** Static `menu.json` file.


* *Structure:* Must be relational (Restaurants -> Categories -> Items -> Modifiers) to support multi-tenancy and language localization natively.




* **Phase 1.5 DB:** API fetch from a published Google Sheet or Airtable base (to allow non-technical restaurant owners to toggle "Out of Stock" status instantly).

### 5. Core Business Logic: The WhatsApp Engine

* **Functionality:** The checkout button does not send a POST request to a server. Instead, it extracts the Zustand cart state and compiles it into a URL-encoded string.


* **Output:** Triggers a native deep link (`[https://wa.me/](https://wa.me/){number}?text={encoded_order}`).



### 6. Deployment & Environment

* **Hosting:** Vercel (Edge network optimized for instant QR-code scans).


* **Version Control:** Git via GitLab CLI.

## 📐 Development Rules for the AI Agent

1. **Prioritize Web Performance:** The app will primarily be accessed via QR code on mobile web browsers (Safari/Chrome). Avoid heavy native-only modules.
2. **No Boilerplate Backend:** Do not generate Express, Node.js, or Laravel backend code. This is a purely client-side web application for V1.0.
3. **Modular Components:** Separate UI (Product Cards, Cart Footer) from the state logic (Zustand store).
4. **Defensive String Formatting:** The WhatsApp URL generator must handle edge cases (empty carts, missing modifiers, missing table numbers) gracefully without breaking the URL encoding.