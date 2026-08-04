import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { itemSchema } from "@/lib/schemas";
import { assertFeature, requireRole } from "@/lib/dashboard";

export async function POST(request: Request) {
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "menu_editor");
  if (featureError) return featureError;

  const body = await request.json().catch(() => null);
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => i.message).join(", ");
    console.error("POST /api/dashboard/items validation failure:", parsed.error.format());
    return NextResponse.json({ error: `Données invalides: ${errorDetails}` }, { status: 400 });
  }

  // RLS enforces owner-only writes scoped to the tenant.
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      restaurant_id: guard.ctx.restaurant.id,
      category_id: parsed.data.category_id,
      name_fr: parsed.data.name_fr,
      name_ar: parsed.data.name_ar || null,
      name_es: parsed.data.name_es || null,
      description_fr: parsed.data.description_fr || null,
      base_price: parsed.data.base_price,
      in_stock: parsed.data.in_stock ?? true,
      is_smart_menu_eligible: parsed.data.is_smart_menu_eligible ?? false,
      image_url: parsed.data.image_url ?? null,
      customization_groups: parsed.data.customization_groups ?? [],
      i18n: parsed.data.i18n ?? {},
    })
    .select("id")
    .single();

  if (error || !item) {
    console.error("POST /api/dashboard/items db insert error:", error);
    return NextResponse.json({ error: error?.message || "Création impossible" }, { status: 500 });
  }
  revalidateTag("menu", "max");
  return NextResponse.json({ id: item.id }, { status: 201 });
}
