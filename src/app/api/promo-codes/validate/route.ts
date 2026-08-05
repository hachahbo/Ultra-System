import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { promoCodeValidateSchema } from "@/lib/schemas";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { formatPrice } from "@/lib/format";
import { evaluatePromoCode } from "@/lib/promo";

// Public promo code lookup — used by both the checkout page and the
// standalone /[slug]/gifts redemption page. Codes have no public RLS read
// policy (0029_promo_codes.sql), so this is the only way a visitor can ever
// resolve one: one exact code at a time, via the service role. Rate-limited
// per IP so this can't be used to brute-force a restaurant's active codes.
export async function POST(request: Request) {
  const t = await getTranslations("Errors");
  const ip = clientIp(request);
  const limit = await checkRateLimit(`promo:ip:${ip}`, 20, 60);
  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds, t("rateLimited"));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("invalidBody") }, { status: 400 });
  }

  const parsed = promoCodeValidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: t("invalidData") }, { status: 400 });
  }
  const { restaurant_slug, code, subtotal } = parsed.data;

  const supabase = createAdminClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, currency")
    .eq("slug", restaurant_slug)
    .maybeSingle();
  if (!restaurant) {
    return NextResponse.json({ error: t("restaurantNotFound") }, { status: 404 });
  }

  const { data: promo } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (!promo || !promo.active) {
    return NextResponse.json({ error: t("promoCodeInvalid") }, { status: 404 });
  }

  const result = evaluatePromoCode(promo, subtotal);
  if (!result.ok) {
    const messages = {
      expired: t("promoCodeExpired"),
      limit_reached: t("promoCodeLimitReached"),
      min_order: t("promoCodeMinOrder", {
        amount: formatPrice(promo.min_order_amount, restaurant.currency),
      }),
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
  }

  return NextResponse.json({
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: Number(promo.discount_value),
    discount_amount: result.discountAmount,
  });
}
