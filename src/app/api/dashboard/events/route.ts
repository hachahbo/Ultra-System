import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";
import { eventSchema } from "@/lib/schemas";

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      // NFD splits accented letters into base + combining mark; stripping
      // non-ASCII then drops the marks (é → e, etc.).
      .normalize("NFD")
      .replace(/[^\x00-\x7f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "evenement"
  );
}

// Empty-string optional fields come from the form as "" — store null.
function nullify(v: string | undefined): string | null {
  return v && v.trim() ? v : null;
}

export async function GET() {
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "events");
  if (featureError) return featureError;

  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  // RLS "events owner write" is owner-only.
  const guard = await requireRole(["owner"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "events");
  if (featureError) return featureError;

  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const v = parsed.data;
  const supabase = await createClient();

  const row = {
    restaurant_id: guard.ctx.restaurant.id,
    title: v.title,
    tagline: nullify(v.tagline),
    description: nullify(v.description),
    category: v.category,
    status: v.status,
    cover_image: nullify(v.cover_image),
    badge_label: nullify(v.badge_label),
    start_date: v.start_date,
    end_date: nullify(v.end_date),
    doors_open: nullify(v.doors_open),
    is_free_entry: v.is_free_entry,
    ticket_price: v.ticket_price,
    currency: v.currency,
    minimum_spend_per_person: v.minimum_spend_per_person,
    max_seats: v.max_seats ?? null,
    reserved_seats: v.reserved_seats ?? 0,
  };

  const base = slugify(v.title);
  // Retry once with a random suffix if the (restaurant_id, slug) unique
  // constraint collides.
  let insertRes = await supabase
    .from("events")
    .insert({ ...row, slug: base })
    .select("id")
    .single();
  if (insertRes.error?.code === "23505") {
    insertRes = await supabase
      .from("events")
      .insert({ ...row, slug: `${base}-${Math.random().toString(36).slice(2, 6)}` })
      .select("id")
      .single();
  }

  if (insertRes.error || !insertRes.data) {
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }

  revalidateTag("events", "max");
  return NextResponse.json({ id: insertRes.data.id }, { status: 201 });
}
