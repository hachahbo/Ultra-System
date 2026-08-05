import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";
import { z } from "zod";
import { phoneSchema } from "@/lib/schemas";

const createReservationSchema = z.object({
  customer_name: z.string().trim().min(1, "Nom requis").max(100),
  customer_phone: phoneSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
  party_size: z.coerce.number().int().min(1, "Minimum 1 personne").max(50),
  note: z.string().trim().max(500).optional().nullable(),
  assigned_table_number: z.string().trim().max(10).optional().nullable(),
  status: z.enum(["new", "confirmed", "declined"]).default("confirmed"),
});

export async function GET() {
  const guard = await requireRole(["owner", "manager", "serveur"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "reservations");
  if (featureError) return featureError;

  const supabase = await createClient();
  // Fetches past + future so the day filter (Aujourd'hui/À venir/Passées)
  // has something to show for "Passées" too — pilot scale, no date bound.
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*")
    .order("date")
    .order("time")
    .limit(500);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  const guard = await requireRole(["owner", "manager", "serveur"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "reservations");
  if (featureError) return featureError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      restaurant_id: guard.ctx.restaurant.id,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      date: parsed.data.date,
      time: parsed.data.time,
      party_size: parsed.data.party_size,
      note: parsed.data.note ?? null,
      assigned_table_number: parsed.data.assigned_table_number ?? null,
      status: parsed.data.status,
    })
    .select("*")
    .single();

  if (error || !reservation) {
    return NextResponse.json({ error: "Échec de l'enregistrement de la réservation" }, { status: 500 });
  }

  return NextResponse.json({ reservation }, { status: 201 });
}
