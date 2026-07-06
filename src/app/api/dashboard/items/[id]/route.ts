import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { customizationGroupSchema } from "@/lib/schemas";

const patchSchema = z
  .object({
    category_id: z.string().uuid(),
    name_fr: z.string().trim().min(1).max(120),
    name_ar: z.string().trim().max(120).nullable(),
    name_es: z.string().trim().max(120).nullable(),
    description_fr: z.string().trim().max(300).nullable(),
    base_price: z.number().min(0).max(10000),
    in_stock: z.boolean(),
    image_url: z.string().url().nullable(),
    sort_order: z.number().int().min(0),
    customization_groups: z.array(customizationGroupSchema).max(10),
  })
  .partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // RLS: owner-only, scoped to the tenant.
  const { data, error } = await supabase
    .from("items")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }
  revalidateTag("menu", "max");
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }
  revalidateTag("menu", "max");
  return NextResponse.json({ ok: true });
}
