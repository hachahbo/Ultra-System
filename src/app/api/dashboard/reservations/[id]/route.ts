import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z
  .object({
    status: z.enum(["new", "confirmed", "declined"]),
    assigned_table_number: z.string().trim().max(10).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Aucune modification");

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

  const { data, error } = await supabase
    .from("reservations")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Réservation introuvable" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
