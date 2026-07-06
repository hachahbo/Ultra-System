import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  ChefHat,
  UserPlus,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/dashboard";
import { startOfTodayCasa, endOfTodayCasa } from "@/lib/time";
import { formatPrice, formatDateTime } from "@/lib/format";
import type { Item, Order } from "@/lib/types";

export const metadata: Metadata = { title: "Aperçu" };

export default async function OverviewPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (ctx.profile.role !== "owner") redirect("/dashboard/orders");

  const supabase = await createClient();
  const todayStart = startOfTodayCasa().toISOString();
  const todayEnd = endOfTodayCasa().toISOString();

  const [ordersToday, pendingReservations, newCustomers, outOfStock, lastOrders] =
    await Promise.all([
      supabase
        .from("orders")
        .select("total")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd),
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .gte("first_seen", todayStart)
        .lte("first_seen", todayEnd),
      supabase
        .from("items")
        .select("id, name_fr")
        .eq("in_stock", false)
        .limit(6),
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const todaysOrders = ordersToday.data ?? [];
  const revenueToday = todaysOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const outOfStockItems = (outOfStock.data ?? []) as Pick<Item, "id" | "name_fr">[];
  const recentOrders = (lastOrders.data ?? []) as Order[];

  const cards = [
    {
      label: "Commandes aujourd'hui",
      value: String(todaysOrders.length),
      icon: ChefHat,
    },
    {
      label: "Revenu aujourd'hui",
      value: formatPrice(revenueToday, ctx.restaurant.currency),
      icon: Wallet,
    },
    {
      label: "Réservations en attente",
      value: String(pendingReservations.count ?? 0),
      icon: CalendarClock,
    },
    {
      label: "Nouveaux clients",
      value: String(newCustomers.count ?? 0),
      icon: UserPlus,
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Aperçu</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Un coup d&apos;œil rapide sur la journée.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="gap-1.5 p-4">
            <c.icon className="size-4 text-muted-foreground" />
            <p className="mt-1 text-xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {outOfStockItems.length > 0 && (
        <Link
          href="/dashboard/menu"
          className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            {outOfStockItems.length} article
            {outOfStockItems.length > 1 ? "s" : ""} épuisé
            {outOfStockItems.length > 1 ? "s" : ""} :{" "}
            {outOfStockItems.map((i) => i.name_fr).join(", ")}
          </span>
        </Link>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">
          Dernières commandes
        </h2>
        <Link
          href="/dashboard/orders"
          className="text-sm font-medium text-primary hover:underline"
        >
          Voir tout
        </Link>
      </div>

      {recentOrders.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Aucune commande pour le moment.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {recentOrders.map((o) => (
            <Card key={o.id} className="flex-row items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={o.type === "dine_in" ? "secondary" : "outline"}>
                    {o.type === "dine_in" ? `Table ${o.table_number}` : "Livraison"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(o.created_at)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {o.items.map((l) => `${l.quantity}× ${l.name}`).join(", ")}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">
                {formatPrice(o.total, ctx.restaurant.currency)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
