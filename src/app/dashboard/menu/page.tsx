import type { Metadata } from "next";
import { MenuManager } from "@/components/dashboard/menu-manager";

export const metadata: Metadata = { title: "Menu" };

export default function DashboardMenuPage() {
  return <MenuManager />;
}
