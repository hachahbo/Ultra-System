import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireOwner, requireSession } from "@/lib/dashboard";
import { tableSchema } from "@/lib/schemas";

// Tenant read — staff use this for the live orders map, not just owners.
export async function GET() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "floor_plan");
  if (featureError) return featureError;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .order("number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
  return NextResponse.json({ tables: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "floor_plan");
  if (featureError) return featureError;

  const parsed = tableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tables")
    .insert({
      restaurant_id: guard.ctx.restaurant.id,
      number: parsed.data.number,
      seats: parsed.data.seats,
      pos_x: parsed.data.pos_x ?? 0.1,
      pos_y: parsed.data.pos_y ?? 0.1,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ce numéro de table existe déjà" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
  return NextResponse.json({ table: data }, { status: 201 });
}
