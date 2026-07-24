import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/dashboard";

const patchSchema = z.object({
  status: z.enum(["new", "preparing", "done"]).optional(),
  customer_name: z.string().nullable().optional(),
  table_number: z.string().nullable().optional(),
  type: z.enum(["dine_in", "delivery"]).optional(),
  note: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const supabase = await createClient();

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.customer_name !== undefined) updates.customer_name = parsed.data.customer_name;
  if (parsed.data.table_number !== undefined) updates.table_number = parsed.data.table_number;
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;

  let query = supabase.from("orders").update(updates).eq("id", id);
  if (parsed.data.updated_at) {
    query = query.eq("updated_at", parsed.data.updated_at);
  }

  const { data, error } = await query.select("*").maybeSingle();

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

