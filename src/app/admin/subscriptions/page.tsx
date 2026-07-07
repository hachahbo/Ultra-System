import type { Metadata } from "next";
import { SubscriptionsView } from "@/components/admin/subscriptions-view";

export const metadata: Metadata = { title: "Abonnements" };

export default function AdminSubscriptionsPage() {
  return <SubscriptionsView />;
}
