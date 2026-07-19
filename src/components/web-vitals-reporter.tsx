"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { onCLS, onLCP, onINP, onFCP, onTTFB, type Metric } from "web-vitals";

// networkInformation isn't in lib.dom's Navigator type yet — narrow cast at
// the read site instead of widening the global Navigator type.
function connectionType(): string | undefined {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
  return nav.connection?.effectiveType;
}

export function WebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    const report = (metric: Metric) => {
      const payload = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        pathname,
        connectionType: connectionType(),
      });
      // sendBeacon survives navigation away from the page; fall back to a
      // keepalive fetch where it's unavailable.
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/vitals", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/vitals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    onCLS(report);
    onLCP(report);
    onINP(report);
    onFCP(report);
    onTTFB(report);
  }, [pathname]);

  return null;
}
