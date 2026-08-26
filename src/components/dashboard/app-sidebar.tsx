"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ConciergeBell,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  LogOut,
  Package,
  PartyPopper,
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
import { ClockWidget } from "@/components/dashboard/clock-widget";
import type { FeatureKey } from "@/lib/types";
import { canAccessRoute, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  /** Key into the Dashboard.* messages. */
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
    label: "groupOperations",
    items: [
      { href: "/dashboard", label: "navOverview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/kds", label: "navKds", icon: UtensilsCrossed, feature: "kds" },
      { href: "/dashboard/service", label: "navService", icon: ConciergeBell },
      { href: "/dashboard/orders", label: "navOrders", icon: ShoppingBag },
      { href: "/dashboard/reservations", label: "navReservations", icon: CalendarDays, feature: "reservations" },
    ],
  },
  {
    label: "groupContent",
    items: [
      { href: "/dashboard/menu", label: "navMenu", icon: UtensilsCrossed, feature: "menu_editor" },
      { href: "/dashboard/events", label: "navEvents", icon: PartyPopper, feature: "events" },
      { href: "/dashboard/tables", label: "navTables", icon: LayoutGrid, feature: "floor_plan" },
    ],
  },
  {
    label: "groupManagement",
    items: [
      { href: "/dashboard/inventory", label: "navInventory", icon: Package, feature: "inventory" },
      { href: "/dashboard/customers", label: "navCustomers", icon: Users },
      { href: "/dashboard/analytics", label: "navAnalytics", icon: LineChart, feature: "analytics" },
    ],
  },
  {
    label: "groupSystem",
    items: [
      { href: "/dashboard/team", label: "navTeam", icon: UserCog, feature: "staff_management" },
      { href: "/dashboard/settings", label: "navSettings", icon: Settings },
    ],
  },
];

export function AppSidebar({
  restaurantName,
  logoUrl,
  role,
  features,
}: {
  restaurantName: string;
  logoUrl?: string | null;
  role: Role;
  features: Record<FeatureKey, boolean>;
}) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const router = useRouter();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  async function signOut() {
    if (isMobile) setOpenMobile(false);
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
    <Sidebar collapsible="icon" className="border-r border-r-border bg-[var(--bg)]">
      <SidebarHeader className="p-4 pb-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:pt-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-[32px] shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[13px] font-semibold text-[var(--accent-text)] group-data-[collapsible=icon]:mx-auto">
            {logoUrl ? (
              <img src={logoUrl} alt={restaurantName} className="size-full object-contain bg-white" />
            ) : (
              restaurantName.charAt(0).toUpperCase()
            )}
          </div>
          {!collapsed && (
            <p className="truncate text-[13px] font-semibold text-[var(--text)]">
              {restaurantName}
            </p>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2 group-data-[collapsible=icon]:px-0">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label} className="pt-2 pb-1 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
            <SidebarGroupLabel className="px-[10px] pb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--text-subtle)]">
              {t(group.label)}
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
                        tooltip={t(item.label)}
                        className={cn(
                          "relative min-h-[34px] rounded-[var(--r-sm)] px-[10px] text-[var(--text-muted)] transition-colors",
                          "hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                          "group-data-[collapsible=icon]:!size-[34px] group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto",
                          // Sanctioned accent use #2: a 2px bar, nothing more.
                          // The icon and label stay neutral on purpose.
                          active &&
                            "bg-[var(--surface-2)] font-medium text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] before:absolute before:left-0 before:h-4 before:w-[2px] before:rounded-r-[2px] before:bg-[var(--accent-fill)] before:content-['']"
                        )}
                      >
                        <Link
                          href={item.href}
                          onClick={() => isMobile && setOpenMobile(false)}
                          className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0"
                        >
                          <item.icon
                            className={cn(
                              "size-[15px] shrink-0",
                              active ? "opacity-100" : "opacity-75"
                            )}
                          />
                          <span className="text-[13px] group-data-[collapsible=icon]:hidden">{t(item.label)}</span>
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

      <SidebarFooter className="mt-auto border-t border-[var(--border)] p-3 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:pb-4">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <ClockWidget />
          <SidebarMenuItem className="w-full">
            <SidebarMenuButton
              onClick={signOut}
              tooltip={t("signOut")}
              className={cn(
                "min-h-[34px] rounded-[var(--r-sm)] px-[10px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                "group-data-[collapsible=icon]:!size-[34px] group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto"
              )}
            >
              <LogOut className="size-[15px] shrink-0 opacity-75 group-data-[collapsible=icon]:mr-0" />
              <span className="text-[13px] group-data-[collapsible=icon]:hidden">{t("signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
