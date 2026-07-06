import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/dashboard";
import { restaurantSettingsSchema } from "@/lib/schemas";

export async function PATCH(request: Request) {
  const guard = await requireOwner();
  if ("response" in guard) return guard.response;

  const parsed = restaurantSettingsSchema
    .partial()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // Server client, not admin: RLS's "restaurants owner update" policy is a
  // second, independent check on top of requireOwner().
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update(parsed.data)
    .eq("id", guard.ctx.restaurant.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }
  // Public site reads branding/fees/toggles from the cached menu tag.
  revalidateTag("menu", "max");
  return NextResponse.json({ ok: true });
}
