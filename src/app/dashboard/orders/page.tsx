import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/dashboard";
import { OrdersView } from "@/components/dashboard/orders-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navOrders") };
}

export default async function OrdersPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");

  // Settling payment (marking paid/refunded) is narrower than editing an
  // order — serveur/cuisine can see and update orders but not money.
  const canSettlePayment = ctx.profile.role === "owner" || ctx.profile.role === "manager";

  return <OrdersView role={ctx.profile.role} canSettlePayment={canSettlePayment} />;
}
