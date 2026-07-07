import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/nav";
import { AdminProviders } from "@/components/admin/providers";
import { getAdminContext } from "@/lib/admin-auth";
import { getSessionContext } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminContext();
  if (!admin) {
    // Not a platform admin — if they're a tenant user, send them to their own
    // dashboard instead of bouncing them to /login (which would loop them
    // straight back here via the proxy's authenticated-user redirect).
    const tenantCtx = await getSessionContext();
    redirect(tenantCtx ? "/dashboard" : "/login");
  }

  return (
    <AdminProviders>
      <div className="flex min-h-dvh flex-col bg-muted/30 md:flex-row">
        <AdminNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </AdminProviders>
  );
}
