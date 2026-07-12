import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  status: z.enum(["new", "preparing", "done"]),
  // Optimistic-concurrency token: the client's last-known updated_at.
  // Mismatch (another staff member already updated this order) -> 409.
  updated_at: z.string(),
});

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
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // RLS restricts the update to the user's own restaurant. The updated_at
  // match is the optimistic-concurrency check: 0 rows means someone else
  // already changed this order since the client last read it.
  const { data, error } = await supabase
    .from("orders")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("updated_at", parsed.data.updated_at)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }
  if (!data) {
    const { data: current } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!current) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Commande déjà mise à jour", order: current },
      { status: 409 },
    );
  }
  return NextResponse.json({ order: data });
}
