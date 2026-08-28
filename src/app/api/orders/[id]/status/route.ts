import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { orderTrackSchema } from "@/lib/schemas";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { normalizeOrderStatus } from "@/lib/order-flow";
import type { OrderLine } from "@/lib/types";

// GET /api/orders/[id]/status?restaurant_slug=… — public order tracking.
//
// `orders` has no public SELECT policy (0001_init.sql) and this route does
// not add one — it goes through the admin client for one row at a time, the
// same pattern /api/promo-codes/validate already uses for a table with no
// anon access. The order's own UUID (122 random bits) is the credential: no
// login, no per-customer account. Whoever holds the link can see this order's
// status, so the response is deliberately thin — no total, no phone, no
// address, no payment info. A forwarded screenshot or a phone passed around
// the table should only ever reveal "table 4, two mains, still cooking".
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(request);
  // Generous vs. the 10/60 write limit on /api/orders — this is read-only
  // polling from a single device every 10s, not a form submission.
  const limit = await checkRateLimit(`order-track:ip:${ip}`, 60, 60);
  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const { id } = await params;
  const url = new URL(request.url);
  const parsed = orderTrackSchema.safeParse({
    order_id: id,
    restaurant_slug: url.searchParams.get("restaurant_slug"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const supabase = createAdminClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", parsed.data.restaurant_slug)
    .maybeSingle();
  if (!restaurant) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  // restaurant_id in the predicate, not just the id — an order id valid for
  // one tenant must not resolve against another tenant's slug.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, table_number, type, created_at, ready_at, items")
    .eq("id", parsed.data.order_id)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: normalizeOrderStatus(order.status),
    table_number: order.table_number,
    type: order.type,
    created_at: order.created_at,
    ready_at: order.ready_at,
    // name + quantity only — unit_price dropped, same reasoning as the total.
    items: (order.items as OrderLine[]).map((l) => ({
      name: l.name,
      quantity: l.quantity,
    })),
  });
}
