import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { reservationSchema } from "@/lib/schemas";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

// Public reservation intake — written to the DB (never WhatsApp-only, §2).
// Owner confirms/declines manually from the dashboard (§3D).
export async function POST(request: Request) {
  // Errors go straight into a toast on the public site, so they follow the
  // visitor's locale cookie like the rest of the page.
  const t = await getTranslations("Errors");
  const ip = clientIp(request);
  const ipLimit = await checkRateLimit(`reservation:ip:${ip}`, 5, 60);
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds, t("rateLimited"));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("invalidBody") }, { status: 400 });
  }

  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t("invalidData"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const supabase = createAdminClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, plan, status")
    .eq("slug", input.restaurant_slug)
    .maybeSingle();
  if (!restaurant) {
    return NextResponse.json({ error: t("restaurantNotFound") }, { status: 404 });
  }
  const features = applyStatusGate(
    restaurant.status,
    await getPublicFeatures(restaurant.id, restaurant.plan),
  );
  if (!features.reservations) {
    return NextResponse.json({ error: t("reservationsUnavailable") }, { status: 403 });
  }

  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      restaurant_id: restaurant.id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      date: input.date,
      time: input.time,
      party_size: input.party_size,
      note: input.note ?? null,
    })
    .select("id")
    .single();

  if (error || !reservation) {
    return NextResponse.json({ error: t("saveFailed") }, { status: 500 });
  }

  return NextResponse.json({ id: reservation.id }, { status: 201 });
}
