import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/dashboard";

// Order history for one customer — owner/manager (same access as
// /dashboard/customers itself and the RLS-scoped CSV export).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;

  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }

  const totalSpent = (orders ?? []).reduce((sum, o) => sum + Number(o.total), 0);
  return NextResponse.json({ orders: orders ?? [], total_spent: totalSpent });
}
