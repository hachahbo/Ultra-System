"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, RotateCw, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [localKey, setLocalKey] = useState(0);

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

  const previewUrl = `/${slug}?_preview=${refreshKey}-${localKey}`;

  return (
    <div className="sticky top-6 space-y-3">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-card border border-border/80 p-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-foreground">Aperçu en direct</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Device Toggles */}
          <div className="flex rounded-xl bg-muted p-0.5 border border-border/50">
            <Button
              type="button"
              variant={device === "desktop" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setDevice("desktop")}
              aria-label="Vue bureau"
              className={cn("size-7 rounded-lg", device === "desktop" && "shadow-sm")}
            >
              <Monitor className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant={device === "mobile" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setDevice("mobile")}
              aria-label="Vue mobile"
              className={cn("size-7 rounded-lg", device === "mobile" && "shadow-sm")}
            >
              <Smartphone className="size-3.5" />
            </Button>
          </div>

          {/* Reload Preview Button */}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setLocalKey((k) => k + 1)}
            aria-label="Recharger l'aperçu"
            className="size-7 rounded-lg"
            title="Recharger l'aperçu"
          >
            <RotateCw className="size-3.5 text-muted-foreground" />
          </Button>

          {/* Open in New Window */}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            asChild
            className="size-7 rounded-lg"
            title="Ouvrir dans un nouvel onglet"
          >
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </a>
          </Button>
        </div>
      </div>

      {/* Frame Preview Viewport Container */}
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-300 mx-auto",
          device === "mobile"
            ? "w-[390px] h-[740px] rounded-[36px] border-[8px] border-slate-900 shadow-2xl bg-black"
            : "w-full h-[740px] rounded-2xl border border-border/80 bg-card shadow-lg"
        )}
      >
        {ready ? (
          <iframe
            key={`${refreshKey}-${localKey}`}
            title="Aperçu du site"
            src={previewUrl}
            className="size-full bg-background transition-all"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">
              Initialisation de l&apos;aperçu…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
