import type { Metadata } from "next";
import { OrdersView } from "@/components/dashboard/orders-view";

export const metadata: Metadata = { title: "Commandes" };

export default function OrdersPage() {
  return <OrdersView />;
}
