import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StaffManagement } from "@/components/dashboard/staff-management";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { getSessionContext } from "@/lib/dashboard";
import { defaultRouteFor } from "@/lib/permissions";

export const metadata: Metadata = { title: "Équipe" };

export default async function TeamPage() {
  const ctx = await getSessionContext();
  // Belt-and-suspenders: the dashboard layout's canAccessRoute gate already
  // redirects non-owners away from /dashboard/team.
  if (!ctx) redirect("/");
  if (ctx.profile.role !== "owner") redirect(defaultRouteFor(ctx.profile.role));

  return (
    <div className="w-full">
      <h1 className="font-display text-3xl font-bold text-foreground">Équipe</h1>
      <p className="mt-1 text-[13.5px] font-medium text-muted-foreground">
        Invitez des managers, serveurs et membres de cuisine, et gérez leur accès.
      </p>

      <div className="mt-6">
        {ctx.features.staff_management ? (
          <StaffManagement />
        ) : (
          <FeatureLocked feature="Gestion de l'équipe" />
        )}
      </div>
    </div>
  );
}
