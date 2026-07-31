import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OrdersView } from "@/components/dashboard/orders-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navOrders") };
}

export default function OrdersPage() {
  return <OrdersView />;
}
