import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { itemSchema } from "@/lib/schemas";

const createSchema = itemSchema.extend({
  image_url: z.string().url().optional().nullable(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });
  }

  // RLS enforces owner-only writes scoped to the tenant.
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      restaurant_id: profile.restaurant_id,
      category_id: parsed.data.category_id,
      name_fr: parsed.data.name_fr,
      name_ar: parsed.data.name_ar || null,
      description_fr: parsed.data.description_fr || null,
      base_price: parsed.data.base_price,
      in_stock: parsed.data.in_stock,
      image_url: parsed.data.image_url ?? null,
    })
    .select("id")
    .single();

  if (error || !item) {
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
  revalidateTag("menu", "max");
  return NextResponse.json({ id: item.id }, { status: 201 });
}
