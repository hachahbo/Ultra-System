import { Badge } from "@/components/ui/badge";
import type { Plan, RestaurantStatus } from "@/lib/types";

// Color semantics used consistently across the admin surface: green = active,
// orange = trial, red = suspended/expired, blue = pro/enterprise.
const STATUS_STYLES: Record<RestaurantStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  trial: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  suspended: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  expired: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

const STATUS_LABELS: Record<RestaurantStatus, string> = {
  active: "Actif",
  trial: "Essai",
  suspended: "Suspendu",
  expired: "Expiré",
};

export function StatusBadge({ status }: { status: RestaurantStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

// Single source of truth for plan colors across the admin surface — was
// three different mappings across restaurants-view/permissions-view
// (avatar chips) and this file's own badge (which didn't even distinguish
// pro from enterprise, both blue). bg/text for avatar chips and solid
// badges; border for the outlined PlanBadge below.
export const PLAN_COLOR_CLASS: Record<Plan, { bg: string; text: string; border: string }> = {
  free: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
  pro: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  enterprise: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function PlanBadge({ plan }: { plan: Plan }) {
  const c = PLAN_COLOR_CLASS[plan];
  return (
    <Badge variant="outline" className={`${c.border} ${c.bg} ${c.text}`}>
      {PLAN_LABELS[plan]}
    </Badge>
  );
}
