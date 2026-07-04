"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChefHat,
  LogOut,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { href: "/dashboard", label: "Commandes", icon: ChefHat, exact: true },
  { href: "/dashboard/reservations", label: "Réservations", icon: CalendarDays },
  { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/dashboard/customers", label: "Clients", icon: Users, ownerOnly: true },
];

export function DashboardNav({
  restaurantName,
  role,
}: {
  restaurantName: string;
  role: "owner" | "staff";
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const visible = tabs.filter((t) => !t.ownerOnly || role === "owner");

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <p className="truncate font-display text-lg font-semibold">
            {restaurantName}
          </p>
          <div className="flex items-center gap-1">
            <nav className="mr-2 hidden gap-1 md:flex">
              {visible.map((t) => (
                <TabLink key={t.href} tab={t} pathname={pathname} />
              ))}
            </nav>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Se déconnecter"
              onClick={signOut}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Bottom tab bar — the dashboard is used on a phone (plan.md §3E) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-flow-col border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {visible.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="size-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function TabLink({
  tab,
  pathname,
}: {
  tab: (typeof tabs)[number];
  pathname: string;
}) {
  const active = tab.exact
    ? pathname === tab.href
    : pathname.startsWith(tab.href);
  return (
    <Link
      href={tab.href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {tab.label}
    </Link>
  );
}
