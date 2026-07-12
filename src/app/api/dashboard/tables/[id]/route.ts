import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireOwner } from "@/lib/dashboard";

const patchSchema = z
  .object({
    number: z.string().trim().min(1).max(10),
    seats: z.number().int().min(1).max(30),
    pos_x: z.number().min(0).max(1),
    pos_y: z.number().min(0).max(1),
    // Optimistic-concurrency token: the client's last-known updated_at.
    // Mismatch (someone else moved/edited this table first) -> 409.
    updated_at: z.string(),
  })
  .partial()
  .required({ updated_at: true });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "floor_plan");
  if (featureError) return featureError;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { updated_at: expectedUpdatedAt, ...fields } = parsed.data;
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tables")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ce numéro de table existe déjà" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }
  if (!data) {
    // Either the table doesn't exist, or someone else updated it first —
    // fetch the current row so the client can reconcile instead of guessing.
    const { data: current } = await supabase
      .from("tables")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!current) {
      return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Cette table a été modifiée entre-temps", table: current },
      { status: 409 },
    );
  }
  return NextResponse.json({ table: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "floor_plan");
  if (featureError) return featureError;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tables")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
