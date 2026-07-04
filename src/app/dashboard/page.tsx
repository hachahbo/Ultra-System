import type { Metadata } from "next";
import { KitchenView } from "@/components/dashboard/kitchen-view";

export const metadata: Metadata = { title: "Commandes" };

export default function OrdersPage() {
  return <KitchenView />;
}
