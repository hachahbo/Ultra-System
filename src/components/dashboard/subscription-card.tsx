import { Card } from "@/components/ui/card";
import { PlanBadge, StatusBadge } from "@/components/admin/badges";
import { formatPrice, formatDateTime } from "@/lib/format";
import type { Restaurant, Subscription } from "@/lib/types";

// Read-only — owners see their plan and billing status, never the internals
// (provider ids, admin notes). Changes are super-admin actions only.
export function SubscriptionCard({
  restaurant,
  subscription,
}: {
  restaurant: Restaurant;
  subscription: Subscription | null;
}) {
  if (!subscription) return null;

  return (
    <Card className="p-4">
      <p className="text-sm font-medium">Abonnement</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PlanBadge plan={restaurant.plan} />
        <StatusBadge status={restaurant.status} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatPrice(subscription.price_mad, restaurant.currency)} /{" "}
        {subscription.billing_cycle === "yearly" ? "an" : "mois"}
      </p>
      {subscription.trial_ends_at && restaurant.status === "trial" && (
        <p className="mt-1 text-sm text-muted-foreground">
          Essai jusqu&apos;au {formatDateTime(subscription.trial_ends_at)}
        </p>
      )}
      {restaurant.status === "suspended" && (
        <p className="mt-2 text-sm text-destructive">
          Compte suspendu — contactez Darna pour le réactiver.
        </p>
      )}
      {restaurant.status === "expired" && (
        <p className="mt-2 text-sm text-destructive">
          Essai expiré — contactez Darna pour souscrire à un plan.
        </p>
      )}
    </Card>
  );
}
