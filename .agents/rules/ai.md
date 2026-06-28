---
trigger: always_on
---

# Project Blueprint: Direct Ordering MVP

## 📌 Context & Philosophy
You are an expert full-stack developer assisting on a Direct Ordering MVP for local restaurants in Morocco. This is a lightweight, mobile-optimized web application (acting as a "Trojan Horse" to bypass third-party apps like Glovo). The philosophy values extreme speed, QR-code optimized mobile web performance, and zero backend boilerplate. 

## 🎯 MVP Scope Boundary (CRITICAL)
Strictly enforce the V1.0 MVP scope.
- **ALLOWED IN MVP:** Expo Web client, Multi-tenant routing (app.domain.ma/[slug]), Zustand cart management, static menu.json or Airtable API integration, WhatsApp URL checkout generation, Mobile-First UI.
- **FORBIDDEN IN MVP:** Any traditional backend (Express, Node, Laravel), actual Payment gateways (Stripe/Cmi) (it uses Cash on Delivery/WhatsApp), Native App compilation (this is web-only for V1).

## 💻 Tech Stack Specifications
- **Framework:** Expo (React Native for Web) via Expo Router.
- **State Management:** Zustand.
- **Data Layer:** Airtable API or Google Sheets (returns JSON payload).
- **Checkout:** WhatsApp Deep Link Generator (no POST requests).
- **Hosting:** Vercel.

## 🏗️ Architectural Rules
1. **No Boilerplate Backend:** Do not generate backend logic or Express servers. 
2. **Modular State:** Separate UI components from Zustand store logic.
3. **Web Compilation Constraint:** Always ensure components and icons (lucide-react-native) are properly configured for Expo Web.
4. **Multi-Tenant Routing:** Respect dynamic routing segments for restaurant slugs and table numbers.

## 👥 Persona & Interaction Style
- Never write code blindly without confirming the underlying architecture first.
- Always optimize for web performance and edge cases in URL generation.
- Keep the system serverless and robust.