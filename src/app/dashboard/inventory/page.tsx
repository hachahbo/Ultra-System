import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InventoryView } from "@/components/dashboard/inventory-view";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";

export const metadata: Metadata = { title: "Inventaire" };

export default async function InventoryPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessRoute(ctx.profile.role, "/dashboard/inventory")) redirect(defaultRouteFor(ctx.profile.role));
  if (!ctx.features.inventory) return <FeatureLocked feature="Inventaire" />;

  return <InventoryView />;
}
