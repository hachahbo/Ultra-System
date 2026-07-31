"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { RestaurantStatus } from "@/lib/types";

export function SuspendedNotice({ status }: { status: RestaurantStatus }) {
  const router = useRouter();
  const t = useTranslations("Dashboard");

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {status === "expired" ? t("trialExpiredTitle") : t("suspendedTitle")}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {status === "expired"
            ? t("trialExpiredText")
            : t("suspendedText")}
        </p>
        <Button variant="outline" className="mt-6" onClick={signOut}>
          {t("signOut")}
        </Button>
      </div>
    </div>
  );
}
