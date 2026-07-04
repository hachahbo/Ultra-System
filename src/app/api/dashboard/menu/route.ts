import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Menu management feed: categories + items for the user's restaurant,
// plus tenant context the client needs (restaurant_id for storage paths).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });
  }

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", profile.restaurant_id)
      .order("sort_order"),
    supabase
      .from("items")
      .select("*")
      .eq("restaurant_id", profile.restaurant_id)
      .order("sort_order"),
  ]);

  return NextResponse.json({
    restaurant_id: profile.restaurant_id,
    role: profile.role,
    categories: categories ?? [],
    items: items ?? [],
  });
}
