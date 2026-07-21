import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardProviders } from "@/components/dashboard/providers";
import { SuspendedNotice } from "@/components/dashboard/suspended-notice";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getSessionContext, isSuspended } from "@/lib/dashboard";
import { getAdminContext } from "@/lib/admin-auth";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";

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

  // Authoritative per-role route gate (the access matrix in
  // src/lib/permissions.ts). The proxy only pre-empts the highest-value
  // owner-only sections at the edge; every /dashboard/* path is enforced
  // here. Pathname comes from the x-pathname header proxy.ts forwards —
  // Server Components have no other way to read the current URL.
  const pathname = (await headers()).get("x-pathname") ?? "/dashboard";
  if (!canAccessRoute(ctx.profile.role, pathname)) {
    redirect(defaultRouteFor(ctx.profile.role));
  }

  // Below the nav/API guard layer on purpose: requireOwner()/requireSession()
  // already 403 every API call for a suspended tenant, but rendering the
  // full dashboard shell around a wall of failed requests would be a worse
  // experience than a direct notice.
  if (isSuspended(ctx.restaurant)) {
    return <SuspendedNotice status={ctx.restaurant.status} />;
  }

  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <DashboardProviders>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar
          restaurantName={ctx.restaurant.name}
          logoUrl={ctx.themeLogoUrl}
          role={ctx.profile.role}
          features={ctx.features}
        />
        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:hidden">
            <SidebarTrigger />
            <p className="truncate font-display text-base font-semibold">
              {ctx.restaurant.name}
            </p>
          </header>
          <main className="mx-auto w-full flex-1 space-y-8 px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DashboardProviders>
  );
}
