import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireOwner } from "@/lib/dashboard";
import { supplierSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "inventory");
  if (featureError) return featureError;

  const parsed = supplierSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert({
      restaurant_id: guard.ctx.restaurant.id,
      name: parsed.data.name,
      category: parsed.data.category,
      status: parsed.data.status ?? "active",
    })
    .select("*")
    .single();

  if (error || !supplier) {
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
  return NextResponse.json({ supplier }, { status: 201 });
}
