// Single source of truth for the 4-role access matrix (plan §RBAC). Pure and
// dependency-free so it's safe to import from the proxy (nodejs runtime),
// server layouts/guards, and client components (sidebar) alike.
//
// 'owner' is the Admin tier — untouched write authority from 0001_init.sql
// onward. 'manager'/'serveur'/'cuisine' are the split of the old 'staff'
// tier (0008_team_roles.sql).

export type Role = "owner" | "manager" | "serveur" | "cuisine";

export const ROLES: Role[] = ["owner", "manager", "serveur", "cuisine"];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Admin",
  manager: "Manager",
  serveur: "Serveur",
  cuisine: "Cuisine",
};

// Ordered most-specific-first; canAccessRoute picks the first prefix match.
export const ROUTE_ACCESS: { prefix: string; exact?: boolean; roles: Role[] }[] = [
  { prefix: "/dashboard/team", roles: ["owner"] },
  { prefix: "/dashboard/settings", roles: ["owner"] },
  { prefix: "/dashboard/analytics", roles: ["owner"] },
  { prefix: "/dashboard/customers", roles: ["owner", "manager"] },
  { prefix: "/dashboard/inventory", roles: ["owner", "manager", "cuisine"] },
  { prefix: "/dashboard/tables", roles: ["owner", "manager", "serveur"] },
  { prefix: "/dashboard/menu", roles: ["owner", "manager", "serveur", "cuisine"] },
  { prefix: "/dashboard/reservations", roles: ["owner", "manager", "serveur"] },
  { prefix: "/dashboard/orders", roles: ["owner", "manager", "serveur", "cuisine"] },
  { prefix: "/dashboard", exact: true, roles: ["owner", "manager"] },
];

export type Resource =
  | "menu"
  | "inventory"
  | "tables"
  | "orders"
  | "reservations"
  | "customers"
  | "team"
  | "settings"
  | "analytics";

// Write authority per resource — mirrors the RLS policies in
// 0008_team_roles.sql (menu/inventory/tables) and the API guards (orders,
// reservations). customers/analytics have no write path; team/settings stay
// owner-only.
export const WRITE_ACCESS: Record<Resource, Role[]> = {
  menu: ["owner", "manager"],
  inventory: ["owner", "manager"],
  tables: ["owner", "manager"],
  orders: ["owner", "manager", "serveur", "cuisine"],
  reservations: ["owner", "manager", "serveur"],
  customers: [],
  team: ["owner"],
  settings: ["owner"],
  analytics: [],
};

export function canAccessRoute(role: Role, pathname: string): boolean {
  const match = ROUTE_ACCESS.find((r) =>
    r.exact ? pathname === r.prefix : pathname.startsWith(r.prefix),
  );
  if (!match) return true; // unlisted dashboard routes are unrestricted
  return match.roles.includes(role);
}

export function canWrite(role: Role, resource: Resource): boolean {
  return WRITE_ACCESS[resource].includes(role);
}

// Safe landing page after a denied route / on login — never a route the
// role itself can't see.
export function defaultRouteFor(role: Role): string {
  return role === "owner" || role === "manager" ? "/dashboard" : "/dashboard/orders";
}
