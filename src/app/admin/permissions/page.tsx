import type { Metadata } from "next";
import { PermissionsView } from "@/components/admin/permissions-view";

export const metadata: Metadata = { title: "Permissions" };

export default function AdminPermissionsPage() {
  return <PermissionsView />;
}
