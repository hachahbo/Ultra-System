import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InventoryView } from "@/components/dashboard/inventory-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Inventaire" };

export default async function InventoryPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profile.role !== "owner") redirect("/dashboard");
  if (!ctx.features.inventory) return <FeatureLocked feature="Inventaire" />;

  return <InventoryView />;
}
