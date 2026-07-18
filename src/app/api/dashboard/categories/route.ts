import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";

const createSchema = z.object({
  name_fr: z.string().trim().min(1).max(80),
  name_ar: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "menu_editor");
  if (featureError) return featureError;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", guard.ctx.restaurant.id);

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      restaurant_id: guard.ctx.restaurant.id,
      name_fr: parsed.data.name_fr,
      name_ar: parsed.data.name_ar || null,
      sort_order: (count ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error || !category) {
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
  revalidateTag("menu", "max");
  return NextResponse.json({ id: category.id }, { status: 201 });
}
