import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { customizationGroupSchema, itemI18nBagSchema, imageUrlSchema } from "@/lib/schemas";
import { assertFeature, requireRole } from "@/lib/dashboard";

const patchSchema = z
  .object({
    i18n: itemI18nBagSchema,
    category_id: z.string().min(1),
    name_fr: z.string().trim().min(1).max(120),
    name_ar: z.string().trim().max(120).nullable().optional().or(z.literal("")),
    name_es: z.string().trim().max(120).nullable().optional().or(z.literal("")),
    description_fr: z.string().trim().max(300).nullable().optional().or(z.literal("")),
    base_price: z.preprocess(
      (val) => (val === "" || val === null || val === undefined || Number.isNaN(Number(val)) ? 0 : Number(val)),
      z.number().min(0).max(10000)
    ),
    in_stock: z.boolean(),
    is_smart_menu_eligible: z.boolean(),
    image_url: imageUrlSchema,
    sort_order: z.number().int().min(0),
    customization_groups: z.array(customizationGroupSchema).max(10),
  })
  .partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "menu_editor");
  if (featureError) return featureError;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    const details = parsed.error ? parsed.error.issues.map((i) => i.message).join(", ") : "Corps vide";
    console.error(`PATCH /api/dashboard/items/${id} validation error:`, parsed.error?.format());
    return NextResponse.json({ error: `Données invalides: ${details}` }, { status: 400 });
  }

  // RLS: owner-only, scoped to the tenant.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error(`PATCH /api/dashboard/items/${id} db update error:`, error);
    return NextResponse.json({ error: error?.message || "Article introuvable" }, { status: 500 });
  }
  revalidateTag("menu", "max");
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "menu_editor");
  if (featureError) return featureError;

  const supabase = await createClient();
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
