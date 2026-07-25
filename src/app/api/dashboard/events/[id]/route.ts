import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";
import { eventSchema } from "@/lib/schemas";

// Partial update — any subset of the event fields, incl. status changes.
const patchSchema = eventSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  "Aucune modification",
);

function nullify(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  return v && v.trim() ? v : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "events");
  if (featureError) return featureError;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const v = parsed.data;

  // Normalize optional "" → null only for the string fields present.
  const update: Record<string, unknown> = { ...v, updated_at: new Date().toISOString() };
  for (const key of ["tagline", "description", "cover_image", "badge_label", "end_date", "doors_open"] as const) {
    if (key in v) update[key] = nullify(v[key] as string | undefined);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  revalidateTag("events", "max");
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "events");
  if (featureError) return featureError;

  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }

  revalidateTag("events", "max");
  return NextResponse.json({ ok: true });
}
