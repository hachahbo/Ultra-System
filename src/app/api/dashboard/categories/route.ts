import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name_fr: z.string().trim().min(1).max(80),
  name_ar: z.string().trim().max(80).optional(),
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

  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", profile.restaurant_id);

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      restaurant_id: profile.restaurant_id,
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
