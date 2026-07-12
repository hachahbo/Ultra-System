"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

// Sets the darna_preview cookie for this restaurant while the builder is
// open (see src/lib/site-theme.ts) so the same-origin iframe renders the
// draft-merged theme instead of the live one — the cookie carries no
// authority by itself, getSiteTheme re-checks the admin session on every
// read. `refreshKey` bumps after a successful draft save to force a reload.
export function PreviewFrame({
  restaurantId,
  slug,
  refreshKey,
}: {
  restaurantId: string;
  slug: string;
  refreshKey: number;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/restaurants/${restaurantId}/theme/preview`, { method: "POST" }).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      fetch(`/api/admin/restaurants/${restaurantId}/theme/preview`, { method: "DELETE" });
    };
  }, [restaurantId]);

  return (
    <div className="sticky top-6 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Aperçu</p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={device === "desktop" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setDevice("desktop")}
            aria-label="Vue bureau"
          >
            <Monitor className="size-4" />
          </Button>
          <Button
            type="button"
            variant={device === "mobile" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setDevice("mobile")}
            aria-label="Vue mobile"
          >
            <Smartphone className="size-4" />
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-muted">
        {ready ? (
          <iframe
            key={refreshKey}
            title="Aperçu du site"
            src={`/${slug}?_preview=${refreshKey}`}
            className="h-[720px] bg-background transition-all"
            style={{ width: device === "mobile" ? "390px" : "100%" }}
          />
        ) : (
          <div className="grid h-[720px] place-items-center text-sm text-muted-foreground">
            Chargement de l&apos;aperçu…
          </div>
        )}
      </div>
    </div>
  );
}
