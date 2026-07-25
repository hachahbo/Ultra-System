import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { eventInquirySchema } from "@/lib/schemas";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

// Public private-hire intake (venue privatization, large groups). Written to
// the DB; the owner reviews/contacts from the dashboard. Uses the service role
// — the restaurant is resolved server-side from the slug, same pattern as the
// public reservation intake (/api/reservations).
export async function POST(request: Request) {
  const ip = clientIp(request);
  const ipLimit = await checkRateLimit(`event-inquiry:ip:${ip}`, 5, 60);
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = eventInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
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
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }

  const features = applyStatusGate(
    restaurant.status,
    await getPublicFeatures(restaurant.id, restaurant.plan),
  );
  if (!features.events) {
    return NextResponse.json({ error: "Événements indisponibles" }, { status: 403 });
  }

  const { data: inquiry, error } = await supabase
    .from("event_inquiries")
    .insert({
      restaurant_id: restaurant.id,
      event_type: input.event_type,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      preferred_date: input.preferred_date || null,
      preferred_time_slot: input.preferred_time_slot ?? null,
      guest_count: input.guest_count,
      budget_estimated_mad: input.budget_estimated_mad ?? null,
      special_requests: input.special_requests || null,
    })
    .select("id")
    .single();

  if (error || !inquiry) {
    return NextResponse.json({ error: "Erreur d'enregistrement" }, { status: 500 });
  }

  return NextResponse.json({ id: inquiry.id }, { status: 201 });
}
