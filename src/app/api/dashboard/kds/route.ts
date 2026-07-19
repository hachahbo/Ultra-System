import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";

// GET /api/dashboard/kds — today's pending + recently bumped tickets
export async function GET() {
  const guard = await requireRole(["owner", "manager", "serveur", "cuisine"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "kds");
  if (featureError) return featureError;

  const supabase = await createClient();
  const since = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(); // last 8h

  const [{ data: tickets, error }, { data: stations }] = await Promise.all([
    supabase
      .from("kds_tickets")
      .select(`
        id, order_id, station_id, lines, status, created_at, bumped_at,
        order:orders(id, table_number, type, customer_name, note, created_at)
      `)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("stations")
      .select("id, name, sort_order")
      .order("sort_order"),
  ]);

  if (error) return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });

  return NextResponse.json({ tickets: tickets ?? [], stations: stations ?? [] });
}
