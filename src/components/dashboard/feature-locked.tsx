import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

// Shown instead of a 404 when a Super-Admin-set feature toggle is off for
// this restaurant's plan — a direct URL hit should explain why, not error.
export async function FeatureLocked({ feature }: { feature: string }) {
  const t = await getTranslations("Dashboard");

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <Lock className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">{t("featureLocked", { feature })}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("featureLockedHint")}</p>
      </div>
    </div>
  );
}
