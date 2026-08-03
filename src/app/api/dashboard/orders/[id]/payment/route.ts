import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/dashboard";

// Marks an order paid/refunded. Separate from the general order PATCH
// (orders/[id]/route.ts) because settling money is a narrower permission
// than editing an order's customer/table/status — serveur and cuisine can
// touch the latter but must not touch the former.
const patchSchema = z.object({
  payment_status: z.enum(["paid", "refunded"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("orders")
    .update({
      payment_status: parsed.data.payment_status,
      paid_at: parsed.data.payment_status === "paid" ? now : null,
      paid_by: parsed.data.payment_status === "paid" ? guard.ctx.profile.id : null,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  return NextResponse.json({ order: data });
}
