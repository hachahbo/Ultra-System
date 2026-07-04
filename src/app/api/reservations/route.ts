import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reservationSchema } from "@/lib/schemas";

// Public reservation intake — written to the DB (never WhatsApp-only, §2).
// Owner confirms/declines manually from the dashboard (§3D).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = reservationSchema.safeParse(body);
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
    .select("id")
    .eq("slug", input.restaurant_slug)
    .maybeSingle();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
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
    return NextResponse.json({ error: "Erreur d'enregistrement" }, { status: 500 });
  }

  return NextResponse.json({ id: reservation.id }, { status: 201 });
}
