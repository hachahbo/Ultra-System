"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  ScrollText,
  ShieldCheck,
  Store,
  Wallet,
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

const links = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { href: "/admin/restaurants", label: "Restaurants", icon: Store },
  { href: "/admin/subscriptions", label: "Abonnements", icon: Wallet },
  { href: "/admin/permissions", label: "Permissions", icon: ShieldCheck },
  { href: "/admin/audit", label: "Journal d'audit", icon: ScrollText },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((l) => {
        const active = isActive(pathname, l.href, l.exact);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <l.icon className="size-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-neutral-950 px-3 py-5 md:flex">
        <p className="px-3 font-display text-lg font-semibold text-white">
          Darna Admin
        </p>
        <div className="mt-6 flex-1">
          <NavLinks pathname={pathname} />
        </div>
        <Button
          variant="ghost"
          className="justify-start gap-2.5 text-white/60 hover:bg-white/5 hover:text-white"
          onClick={signOut}
        >
          <LogOut className="size-4" />
          Se déconnecter
        </Button>
      </aside>

      {/* Mobile top bar + sheet */}
      <header className="flex items-center justify-between border-b bg-neutral-950 px-4 py-3 md:hidden">
        <p className="font-display text-lg font-semibold text-white">Darna Admin</p>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white">
              <MenuIcon className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-neutral-950 p-0 text-white">
            <SheetHeader>
              <SheetTitle className="text-white">Darna Admin</SheetTitle>
            </SheetHeader>
            <div className="px-3 pb-6">
              <NavLinks pathname={pathname} onNavigate={() => setSheetOpen(false)} />
              <Button
                variant="ghost"
                className="mt-4 w-full justify-start gap-2.5 text-white/60 hover:bg-white/5 hover:text-white"
                onClick={signOut}
              >
                <LogOut className="size-4" />
                Se déconnecter
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
