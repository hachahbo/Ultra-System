import { getTranslations } from "next-intl/server";
import { LoadingIcon } from "@/components/ui/loading-icon";

export default async function Loading() {
  const t = await getTranslations("Site");

  return (
    <div className="min-h-[calc(100dvh-100px)] flex flex-col items-center justify-center gap-4 py-12">
      <style>{`[data-site-footer] { display: none !important; }`}</style>
      <LoadingIcon className="size-16" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        {t("loading")}
      </p>
    </div>
  );
}
