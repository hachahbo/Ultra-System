import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireOwner } from "@/lib/dashboard";
import { supplierSchema } from "@/lib/schemas";

const patchSchema = supplierSchema.partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "inventory");
  if (featureError) return featureError;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "inventory");
  if (featureError) return featureError;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
