import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TablesEditor } from "@/components/dashboard/tables-editor";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Tables" };

export default async function TablesPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profile.role !== "owner") redirect("/dashboard");

  return <TablesEditor restaurantSlug={ctx.restaurant.slug} />;
}
