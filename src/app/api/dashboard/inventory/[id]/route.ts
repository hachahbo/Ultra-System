import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireOwner } from "@/lib/dashboard";
import { inventoryItemSchema, stockAdjustSchema } from "@/lib/schemas";

const patchSchema = z.union([inventoryItemSchema.partial(), stockAdjustSchema]);

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
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();

  // Stock +/- steppers send a relative delta — apply it against the current
  // row instead of the client computing (and potentially racing on) the
  // absolute value.
  if ("delta" in parsed.data) {
    const { data: current, error: readError } = await supabase
      .from("inventory_items")
      .select("stock")
      .eq("id", id)
      .maybeSingle();
    if (readError || !current) {
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    }
    const nextStock = Math.max(0, Number(current.stock) + parsed.data.delta);
    const { data, error } = await supabase
      .from("inventory_items")
      .update({ stock: nextStock })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, stock: nextStock });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
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
    .from("inventory_items")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
