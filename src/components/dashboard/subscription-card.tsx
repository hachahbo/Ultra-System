import { Check } from "lucide-react";
import { PlanBadge, StatusBadge } from "@/components/admin/badges";
import { FEATURE_LABELS } from "@/lib/feature-labels";
import { formatPrice, formatDateTime } from "@/lib/format";
import type { FeatureKey, Restaurant, Subscription } from "@/lib/types";

// Read-only — owners see their plan, billing status and included features,
// never the internals (provider ids, admin notes). Changes are super-admin
// actions only (no self-serve upgrade/payment flow exists yet).
export function SubscriptionCard({
  restaurant,
  subscription,
  features,
}: {
  restaurant: Restaurant;
  subscription: Subscription | null;
  features: Record<FeatureKey, boolean>;
}) {
  if (!subscription) return null;

  const includedFeatures = (Object.keys(features) as FeatureKey[]).filter((k) => features[k]);

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-card p-6">
      <div className="flex items-center gap-2">
        <PlanBadge plan={restaurant.plan} />
        <StatusBadge status={restaurant.status} />
      </div>
      <div className="mt-3.5 text-[28px] font-extrabold tracking-tight text-foreground">
        {formatPrice(subscription.price_mad, restaurant.currency)}{" "}
        <span className="text-[15px] font-bold text-muted-foreground">
          / {subscription.billing_cycle === "yearly" ? "an" : "mois"}
        </span>
      </div>
      {subscription.trial_ends_at && restaurant.status === "trial" && (
        <div className="mt-1.5 text-[12.5px] text-muted-foreground">
          Essai jusqu&apos;au {formatDateTime(subscription.trial_ends_at)}
        </div>
      )}
      {subscription.current_period_end && restaurant.status !== "trial" && (
        <div className="mt-1.5 text-[12.5px] text-muted-foreground">
          Prochaine facture le {formatDateTime(subscription.current_period_end)}
        </div>
      )}

      {includedFeatures.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-2.5 border-t border-primary/20 pt-5 sm:grid-cols-2">
          {includedFeatures.map((key) => (
            <div key={key} className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground/80">
              <Check className="size-4 shrink-0 text-emerald-500" />
              {FEATURE_LABELS[key]}
            </div>
          ))}
        </div>
      )}

      {restaurant.status === "suspended" && (
        <p className="mt-4 text-[13px] font-semibold text-destructive">
          Compte suspendu — contactez Darna pour le réactiver.
        </p>
      )}
      {restaurant.status === "expired" && (
        <p className="mt-4 text-[13px] font-semibold text-destructive">
          Essai expiré — contactez Darna pour souscrire à un plan.
        </p>
      )}
    </div>
  );
}
