import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";
import { eventInquiryStatusSchema } from "@/lib/schemas";

const patchSchema = z.object({ status: eventInquiryStatusSchema });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // RLS "event_inquiries owner update" is owner-only.
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "events");
  if (featureError) return featureError;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_inquiries")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
