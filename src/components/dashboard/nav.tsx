"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChefHat,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  Settings,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import type { FeatureKey } from "@/lib/types";

type Tab = {
  href: string;
  label: string;
  icon: typeof ChefHat;
  exact?: boolean;
  ownerOnly?: boolean;
  feature?: FeatureKey;
};

// Primary tabs — always inline, both in the bottom tab bar (mobile) and the
// top nav (desktop). "Aperçu" and "Menu" are owner-only; staff only run
// orders + reservations.
const primaryTabs: Tab[] = [
  { href: "/dashboard", label: "Aperçu", icon: LayoutDashboard, exact: true, ownerOnly: true },
  { href: "/dashboard/orders", label: "Commandes", icon: ChefHat },
  { href: "/dashboard/reservations", label: "Réservations", icon: CalendarDays, feature: "reservations" },
  { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed, ownerOnly: true, feature: "menu_editor" },
];

// Owner-only secondary links, tucked behind "Plus" so the bottom bar on a
// 380px phone stays at 5 items max.
const moreLinks: Tab[] = [
  { href: "/dashboard/customers", label: "Clients", icon: Users },
  { href: "/dashboard/analytics", label: "Statistiques", icon: BarChart3, feature: "analytics" },
  { href: "/dashboard/tables", label: "Tables", icon: LayoutGrid, feature: "floor_plan" },
  { href: "/dashboard/settings", label: "Réglages", icon: Settings },
];

export function DashboardNav({
  restaurantName,
  role,
  features,
}: {
  restaurantName: string;
  role: "owner" | "staff";
  features: Record<FeatureKey, boolean>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isOwner = role === "owner";

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const visible = (t: Tab) => (!t.ownerOnly || isOwner) && (!t.feature || features[t.feature]);
  const tabs = primaryTabs.filter(visible);
  const visibleMoreLinks = moreLinks.filter(visible);
  const moreActive = isOwner && visibleMoreLinks.some((l) => pathname.startsWith(l.href));

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
              {tabs.map((t) => (
                <TabLink key={t.href} tab={t} pathname={pathname} />
              ))}
              {isOwner &&
                visibleMoreLinks.map((t) => (
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
        {tabs.map((t) => {
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
        {isOwner && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  moreActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <MoreHorizontal className="size-5" />
                Plus
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
              <SheetHeader>
                <SheetTitle>Plus</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 px-4 pb-6">
                {visibleMoreLinks.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    onClick={() => setSheetOpen(false)}
                    className={`flex flex-col items-center gap-2 rounded-xl border py-5 text-sm font-medium transition-colors ${
                      pathname.startsWith(t.href)
                        ? "border-primary/60 bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <t.icon className="size-5" />
                    {t.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </nav>
    </>
  );
}

function TabLink({ tab, pathname }: { tab: Tab; pathname: string }) {
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
