"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { SubscriptionCard } from "@/components/dashboard/subscription-card";
import { cn } from "@/lib/utils";
import type { FeatureKey, Restaurant, Subscription } from "@/lib/types";

// `label` indexes into the Settings.* messages.
const TABS = [
  { id: "general", label: "tabGeneral" },
  { id: "billing", label: "tabBilling" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Team management moved to its own first-class page (/dashboard/team) —
// see src/app/dashboard/team/page.tsx.
import { SlidersHorizontal, CreditCard } from "lucide-react";

export function SettingsTabs({
  restaurant,
  subscription,
  features,
}: {
  restaurant: Restaurant;
  subscription: Subscription | null;
  features: Record<FeatureKey, boolean>;
}) {
  const t = useTranslations("Settings");
  const [tab, setTab] = useState<TabId>("general");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border/60 pb-3">
        {TABS.map((tabDef) => {
          const active = tab === tabDef.id;
          const Icon = tabDef.id === "general" ? SlidersHorizontal : CreditCard;
          return (
            <button
              key={tabDef.id}
              type="button"
              onClick={() => setTab(tabDef.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-2xs",
                active
                  ? "border-primary/50 bg-primary/15 text-primary ring-2 ring-primary/20 border"
                  : "border border-border/80 bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-3.5" />
              <span>{t(tabDef.label)}</span>
            </button>
          );
        })}
      </div>

      <div>
        {tab === "general" && <SettingsForm restaurant={restaurant} />}
        {tab === "billing" && (
          <SubscriptionCard restaurant={restaurant} subscription={subscription} features={features} />
        )}
      </div>
    </div>
  );
}
