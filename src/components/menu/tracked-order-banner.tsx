"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChefHat } from "lucide-react";
import { useTrackedOrder } from "@/lib/tracked-orders";

// Shown at the top of the menu page when a guest re-lands on a table's QR
// link (or just revisits the site) while an order they placed from THIS
// table is still open. Lets them find their order again without rescanning
// anything or holding onto the confirmation-screen link — see
// order-tracker.tsx / tracked-orders.ts for the rest of the mechanism.
export function TrackedOrderBanner({ slug, table }: { slug: string; table: string | null }) {
  const t = useTranslations("Track");
  const entry = useTrackedOrder(slug, table);

  if (!entry) return null;

  return (
    <Link
      href={`/${slug}/orders/${entry.id}`}
      className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/10"
    >
      <ChefHat className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="flex-1">{t("bannerText")}</span>
      <span className="text-primary underline">{t("bannerCta")}</span>
    </Link>
  );
}
