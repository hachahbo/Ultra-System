import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { StaffManagement } from "@/components/dashboard/staff-management";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profile.role !== "owner") redirect("/dashboard");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Réglages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Profil du restaurant et accès de l&apos;équipe.
      </p>

      <div className="mt-6">
        <SettingsForm restaurant={ctx.restaurant} />
      </div>

      <div className="mt-8">
        <StaffManagement />
      </div>
    </div>
  );
}
