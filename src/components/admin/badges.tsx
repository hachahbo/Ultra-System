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

const PLAN_STYLES: Record<Plan, string> = {
  free: "border-border text-muted-foreground",
  pro: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  enterprise: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <Badge variant="outline" className={PLAN_STYLES[plan]}>
      {PLAN_LABELS[plan]}
    </Badge>
  );
}
