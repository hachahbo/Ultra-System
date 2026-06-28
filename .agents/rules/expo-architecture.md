---
name: expo_architecture
description: Always enforce clean abstraction between UI, Zustand state, and the Airtable data layer in the Expo application.
triggers:
  - file_glob: "app/**/*"
  - file_glob: "src/**/*"
---

# Rule: Strict Expo & Zustand Architecture

## 🚫 Forbidden Patterns
- Do not write a custom Node.js/Express backend. This is a serverless application.
- Do not send POST requests for order submission. Orders must be compiled into WhatsApp URLs.
- Do not mix complex data fetching logic directly inside UI components.

## ✅ Mandated Architecture
1. **State Management:** Use Zustand to track active restaurant context, parse URL parameters (`?table=`), and manage the cart state globally without redundant re-renders.
2. **Data Fetching Flow:** 
   - Extract `slug` from the Expo router.
   - Fetch JSON from the Airtable REST API.
   - Store payload in Zustand.
3. **WhatsApp Engine:** The checkout process must extract cart state and strictly format it into a URL-encoded string (`https://wa.me/{number}?text={encoded_order}`).

## 🔒 Defensive Programming
- Gracefully handle edge cases in the WhatsApp URL generator (empty carts, missing modifiers, missing table numbers).
- Ensure the Airtable API fetch handles missing data or network errors cleanly.