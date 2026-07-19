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
  Package,
  Settings,
  ShoppingBag,
  Users,
  UserCog,
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
import { canAccessRoute, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  feature?: FeatureKey;
};

type Group = { label: string; items: Item[] };

// Route access itself comes from canAccessRoute (src/lib/permissions.ts) —
// the same access matrix the server layout enforces. This filter is
// cosmetic only; feature flags stay a separate, plan-driven gate.
const groups: Group[] = [
  {
    label: "Opération",
    items: [
      { href: "/dashboard", label: "Aperçu", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/kds", label: "Cuisine (KDS)", icon: UtensilsCrossed, feature: "kds" },
      { href: "/dashboard/orders", label: "Commandes", icon: ShoppingBag },
      { href: "/dashboard/reservations", label: "Réservations", icon: CalendarDays, feature: "reservations" },
    ],
  },
  {
    label: "Contenu",
    items: [
      { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed, feature: "menu_editor" },
      { href: "/dashboard/tables", label: "Tables", icon: LayoutGrid, feature: "floor_plan" },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/dashboard/inventory", label: "Inventaire", icon: Package, feature: "inventory" },
      { href: "/dashboard/customers", label: "Clients", icon: Users },
      { href: "/dashboard/analytics", label: "Statistiques", icon: LineChart, feature: "analytics" },
    ],
  },
  {
    label: "Système",
    items: [
      { href: "/dashboard/team", label: "Équipe", icon: UserCog, feature: "staff_management" },
      { href: "/dashboard/settings", label: "Réglages", icon: Settings },
    ],
  },
];

export function AppSidebar({
  restaurantName,
  role,
  features,
}: {
  restaurantName: string;
  role: Role;
  features: Record<FeatureKey, boolean>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const visible = (item: Item) =>
    canAccessRoute(role, item.href) && (!item.feature || features[item.feature]);

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter(visible) }))
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r-border dark:border-r-0 rounded-r-lg overflow-hidden dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-primary text-base font-extrabold text-primary-foreground">
            {restaurantName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <p className="truncate font-display text-[16px] font-extrabold tracking-tight">
              {restaurantName}
            </p>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label} className="pt-2 pb-1">
            <SidebarGroupLabel className="px-3 text-[10px] font-bold tracking-[1.2px] text-muted-foreground uppercase">
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
                        className={cn(
                          "min-h-[44px] rounded-[14px] px-3.5 transition-all duration-300",
                          active
                            ? "bg-primary text-primary-foreground font-bold shadow-[0_6px_16px_rgba(var(--primary-rgb),0.4)] dark:bg-white/10 dark:text-white dark:shadow-none hover:bg-primary/90 hover:text-primary-foreground dark:hover:bg-white/15 dark:hover:text-white"
                            : "text-muted-foreground font-semibold hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className="size-[18px]" />
                          <span className="text-[13.5px]">{item.label}</span>
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

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Déconnexion"
              className="min-h-[44px] rounded-[14px] px-3.5 text-muted-foreground font-semibold hover:bg-accent/50 hover:text-foreground transition-all duration-300"
            >
              <LogOut className="size-[18px] mr-1.5" />
              <span className="text-[13.5px]">Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Développer le menu" : "Réduire le menu"}
            className="flex min-h-[44px] w-full items-center gap-2 rounded-[14px] px-3.5 text-[13.5px] font-semibold text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden mt-1"
          >
            {collapsed ? <ChevronRight className="size-4 shrink-0" /> : <ChevronLeft className="size-4 shrink-0" />}
            {!collapsed && <span>Réduire le menu</span>}
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
