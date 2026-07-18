"use client";

import { useState } from "react";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { SubscriptionCard } from "@/components/dashboard/subscription-card";
import { cn } from "@/lib/utils";
import type { FeatureKey, Restaurant, Subscription } from "@/lib/types";

const TABS = [
  { id: "general", label: "Général" },
  { id: "billing", label: "Abonnement" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Team management moved to its own first-class page (/dashboard/team) —
// see src/app/dashboard/team/page.tsx.
export function SettingsTabs({
  restaurant,
  subscription,
  features,
}: {
  restaurant: Restaurant;
  subscription: Subscription | null;
  features: Record<FeatureKey, boolean>;
}) {
  const [tab, setTab] = useState<TabId>("general");

  return (
    <div>
      <div className="flex gap-1.5 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-bold transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "general" && <SettingsForm restaurant={restaurant} />}
        {tab === "billing" && (
          <SubscriptionCard restaurant={restaurant} subscription={subscription} features={features} />
        )}
      </div>
    </div>
  );
}
