import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { StaffManagement } from "@/components/dashboard/staff-management";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";
import { defaultRouteFor } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("navTeam") };
}

export default async function TeamPage() {
  const ctx = await getSessionContext();
  // Belt-and-suspenders: the dashboard layout's canAccessRoute gate already
  // redirects non-owners away from /dashboard/team.
  if (!ctx) redirect("/");
  if (ctx.profile.role !== "owner") redirect(defaultRouteFor(ctx.profile.role));

  return (
    <div className="w-full">
      {ctx.features.staff_management ? (
        <StaffManagement />
      ) : (
        <FeatureLocked feature="Gestion de l'équipe" />
      )}
    </div>
  );
}
