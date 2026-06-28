---
trigger: always_on
---

# Skill: Mobile-First Expo Web Component Generation

## 📐 Implementation Philosophy
The design for this restaurant ordering app is strictly mobile-first, accessed via QR code scans on Safari/Chrome. You must prioritize lightweight, web-optimized layouts. Heavy native-only React Native modules should be avoided.

## 🛠️ Step-by-Step Execution Protocol
When tasked with building a UI layout:

1. **Deconstruct Components:** Break the visual design into atomic, reusable React Native components (e.g., `ProductCard.tsx`, `CartFooter.tsx`, `CategoryNav.tsx`).
2. **Apply Styling:** Use React Native `StyleSheet` (or minimalistic Tailwind/NativeWind if configured). Adhere exactly to Figma-provided hex codes, border radii, and padding values. Prioritize flexible flexbox layouts.
3. **Data Binding:** Wire up the components using standard React hooks and the Zustand store to accept dynamic menu data (Categories, Items, Modifiers).
4. **Icons:** Use `lucide-react-native` and ensure web compatibility.

## 💡 Code Sample Goal
Every component must be clean, scannable, and highly responsive for mobile web viewports. Avoid bloated utility chains. Separate the UI representation from the Zustand cart logic.