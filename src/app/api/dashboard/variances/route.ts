import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, requireRole } from "@/lib/dashboard";

// GET /api/dashboard/variances — inventory variance log for the dashboard.
// Supports optional ?limit=N (default 100) and ?item_id=<uuid> filters.
export async function GET(request: Request) {
  const guard = await requireRole(["owner", "manager", "cuisine"]);
  if ("response" in guard) return guard.response;
  const featureError = assertFeature(guard.ctx, "recipes");
  if (featureError) return featureError;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("item_id");
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  let query = supabase
    .from("inventory_variances")
    .select(`
      id, expected_deduction, available_stock, reason, created_at,
      inventory_item:inventory_items(id, name, unit),
      menu_item:items(id, name_fr),
      order:orders(id, created_at)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (itemId) query = query.eq("inventory_item_id", itemId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });

  return NextResponse.json({ variances: data });
}
