import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardProviders } from "@/components/dashboard/providers";
import { SuspendedNotice } from "@/components/dashboard/suspended-notice";
import { getSessionContext, isSuspended } from "@/lib/dashboard";
import { getAdminContext } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx) {
    // Platform admins have no profiles row — send them to their own shell
    // instead of bouncing through "/" (which has no way back to /admin).
    const admin = await getAdminContext();
    redirect(admin ? "/admin" : "/");
  }

  // Forced password change takes over until done. This route lives OUTSIDE
  // /dashboard on purpose — nesting it here would make this same layout
  // redirect to itself on every render (infinite redirect loop). API routes
  // re-check the flag server-side too (requireOwner/requireSession in
  // src/lib/dashboard.ts), since this redirect alone can be bypassed by a
  // direct fetch.
  if (ctx.profile.must_change_password) redirect("/change-password");

  // Below the nav/API guard layer on purpose: requireOwner()/requireSession()
  // already 403 every API call for a suspended tenant, but rendering the
  // full dashboard shell around a wall of failed requests would be a worse
  // experience than a direct notice.
  if (isSuspended(ctx.restaurant)) {
    return <SuspendedNotice status={ctx.restaurant.status} />;
  }

  return (
    <DashboardProviders>
      <div className="flex min-h-dvh flex-col">
        <DashboardNav
          restaurantName={ctx.restaurant.name}
          role={ctx.profile.role}
          features={ctx.features}
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:pb-10">
          {children}
        </main>
      </div>
    </DashboardProviders>
  );
}
