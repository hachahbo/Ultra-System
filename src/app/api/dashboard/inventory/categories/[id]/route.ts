import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireOwner } from "@/lib/dashboard";
import { inventoryCategorySchema } from "@/lib/schemas";

const patchSchema = inventoryCategorySchema.partial();

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
    .from("inventory_categories")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
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
  const { count } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Déplacez d'abord les articles de cette catégorie" },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("inventory_categories")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
