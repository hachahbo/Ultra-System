import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardProviders } from "@/components/dashboard/providers";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  // Authenticated user without a profile row = not provisioned for a tenant.
  // Send to the root page (not /login — the proxy bounces authed users back
  // here, which would loop).
  if (!ctx) redirect("/");

  // Forced password change takes over until done. This route lives OUTSIDE
  // /dashboard on purpose — nesting it here would make this same layout
  // redirect to itself on every render (infinite redirect loop). API routes
  // re-check the flag server-side too (requireOwner/requireSession in
  // src/lib/dashboard.ts), since this redirect alone can be bypassed by a
  // direct fetch.
  if (ctx.profile.must_change_password) redirect("/change-password");

  return (
    <DashboardProviders>
      <div className="flex min-h-dvh flex-col">
        <DashboardNav
          restaurantName={ctx.restaurant.name}
          role={ctx.profile.role}
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:pb-10">
          {children}
        </main>
      </div>
    </DashboardProviders>
  );
}
