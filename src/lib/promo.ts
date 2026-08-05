import "server-only";
import type { PromoCode } from "@/lib/types";

export type PromoEvalResult =
  | { ok: true; discountAmount: number }
  | { ok: false; reason: "expired" | "limit_reached" | "min_order" };

// Pure eligibility + discount math, shared by the public validate route and
// order creation. Order creation re-runs this against a fresh DB read rather
// than trusting the validate response — a code's state (expiry, uses left)
// can change in the time between "Apply" and "Place order".
export function evaluatePromoCode(
  promo: Pick<
    PromoCode,
    "discount_type" | "discount_value" | "min_order_amount" | "max_uses" | "uses_count" | "expires_at"
  >,
  subtotal: number,
): PromoEvalResult {
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return { ok: false, reason: "limit_reached" };
  }
  if (subtotal < Number(promo.min_order_amount)) {
    return { ok: false, reason: "min_order" };
  }
  const raw =
    promo.discount_type === "percentage"
      ? subtotal * (Number(promo.discount_value) / 100)
      : Number(promo.discount_value);
  return { ok: true, discountAmount: Math.round(Math.min(raw, subtotal) * 100) / 100 };
}
