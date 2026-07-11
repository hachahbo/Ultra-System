"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  LogOut,
  Settings,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
import type { FeatureKey } from "@/lib/types";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  ownerOnly?: boolean;
  feature?: FeatureKey;
};

type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Opération",
    items: [
      { href: "/dashboard", label: "Aperçu", icon: LayoutDashboard, exact: true, ownerOnly: true },
      { href: "/dashboard/orders", label: "Commandes", icon: ShoppingBag },
      { href: "/dashboard/reservations", label: "Réservations", icon: CalendarDays, feature: "reservations" },
    ],
  },
  {
    label: "Contenu",
    items: [
      { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed, ownerOnly: true, feature: "menu_editor" },
      { href: "/dashboard/tables", label: "Tables", icon: LayoutGrid, ownerOnly: true, feature: "floor_plan" },
    ],
  },
  {
    label: "Croissance",
    items: [
      { href: "/dashboard/customers", label: "Clients", icon: Users, ownerOnly: true },
      { href: "/dashboard/analytics", label: "Statistiques", icon: LineChart, ownerOnly: true, feature: "analytics" },
    ],
  },
  {
    label: "Système",
    items: [
      { href: "/dashboard/settings", label: "Réglages", icon: Settings, ownerOnly: true },
    ],
  },
];

export function AppSidebar({
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
  const isOwner = role === "owner";
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const visible = (item: Item) =>
    (!item.ownerOnly || isOwner) && (!item.feature || features[item.feature]);

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter(visible) }))
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            {restaurantName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <p className="truncate font-display text-lg font-semibold">
              {restaurantName}
            </p>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className="relative min-h-11 data-[active=true]:before:absolute data-[active=true]:before:inset-y-1 data-[active=true]:before:start-0 data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary"
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Déconnexion"
              className="min-h-11 text-muted-foreground"
            >
              <LogOut />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Développer le menu" : "Réduire le menu"}
            className="flex min-h-11 w-full items-center gap-2 rounded-md p-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            {!collapsed && <span>Réduire le menu</span>}
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
