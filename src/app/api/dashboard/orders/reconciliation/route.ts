import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/dashboard";
import { startOfTodayCasa } from "@/lib/time";
import type { Order } from "@/lib/types";

// Daily cash reconciliation (Phase 8.1 §2.3) — owner/manager only, same
// narrower-than-orders-edit permission as the payment PATCH route. "Today"
// is Casablanca-local, matching every other dashboard day-boundary
// computation (src/lib/time.ts).
export async function GET() {
  const guard = await requireRole(["owner", "manager"]);
  if ("response" in guard) return guard.response;

  const supabase = await createClient();
  const todayStart = startOfTodayCasa().toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select("id, type, table_number, customer_name, total, status, payment_status, paid_by, created_at")
    .eq("restaurant_id", guard.ctx.restaurant.id)
    .gte("created_at", todayStart)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }

  const orders = (data ?? []) as Pick<
    Order,
    "id" | "type" | "table_number" | "customer_name" | "total" | "status" | "payment_status" | "paid_by" | "created_at"
  >[];

  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  // A cancelled order that was never paid is not money anyone owes, so it must
  // not land in "outstanding". A cancelled order that WAS paid deliberately
  // stays in `paidOrders` — that is real cash collected against a refund due,
  // and hiding it would make the till not balance.
  const unpaidOrders = orders.filter(
    (o) => o.payment_status === "unpaid" && o.status !== "cancelled",
  );

  const collectedTotal = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const outstandingTotal = unpaidOrders.reduce((sum, o) => sum + Number(o.total), 0);

  // Per-staff breakdown — profiles carries no display name (see
  // staff/route.ts), so resolve emails from auth the same way that route
  // does. Small teams, small N, same accepted N+1 as the existing pattern.
  const staffIds = [...new Set(paidOrders.map((o) => o.paid_by).filter((id): id is string => !!id))];
  const admin = createAdminClient();
  const staffEmails = new Map(
    await Promise.all(
      staffIds.map(async (id) => {
        const { data: userData } = await admin.auth.admin.getUserById(id);
        return [id, userData.user?.email ?? "—"] as const;
      }),
    ),
  );

  const byStaffMap = new Map<string, { staffId: string; email: string; total: number; count: number }>();
  for (const o of paidOrders) {
    if (!o.paid_by) continue;
    const entry = byStaffMap.get(o.paid_by) ?? {
      staffId: o.paid_by,
      email: staffEmails.get(o.paid_by) ?? "—",
      total: 0,
      count: 0,
    };
    entry.total += Number(o.total);
    entry.count += 1;
    byStaffMap.set(o.paid_by, entry);
  }

  return NextResponse.json({
    collectedTotal,
    outstandingTotal,
    paidCount: paidOrders.length,
    unpaidOrders,
    byStaff: [...byStaffMap.values()].sort((a, b) => b.total - a.total),
  });
}
