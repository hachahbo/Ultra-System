"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChefHat, Clock, UtensilsCrossed, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { forgetOrder } from "@/lib/tracked-orders";
import type { OrderStatus } from "@/lib/order-flow";

type TrackedTicket = {
  id: string;
  status: OrderStatus;
  table_number: string | null;
  type: "dine_in" | "takeaway" | "delivery";
  created_at: string;
  ready_at: string | null;
  items: { name: string; quantity: number; options: string[] }[];
};

// Mirrors the client-facing half of order-flow.ts's state machine (pending →
// confirmed → preparing → ready → served). 'confirmed' is folded into the
// same step as 'preparing' here — order-flow.ts calls it transient (a single
// DB transaction, never something a poll is likely to observe), and showing
// the guest a step that visually flickers past in under a second would read
// as a glitch rather than progress.
const STEPS: { key: OrderStatus[]; icon: typeof Clock; label: string }[] = [
  { key: ["pending"], icon: Clock, label: "stepReceived" },
  { key: ["confirmed", "preparing"], icon: ChefHat, label: "stepPreparing" },
  { key: ["ready"], icon: UtensilsCrossed, label: "stepReady" },
  { key: ["served"], icon: CheckCircle2, label: "stepServed" },
];

function stepIndex(status: OrderStatus): number {
  const i = STEPS.findIndex((s) => s.key.includes(status));
  return i === -1 ? 0 : i;
}

async function fetchStatus(slug: string, orderId: string): Promise<TrackedTicket | null> {
  const res = await fetch(
    `/api/orders/${orderId}/status?restaurant_slug=${encodeURIComponent(slug)}`,
  );
  if (!res.ok) return null;
  return res.json();
}

export function OrderTracker({
  slug,
  orderId,
  restaurantName,
}: {
  slug: string;
  orderId: string;
  restaurantName: string;
}) {
  const t = useTranslations("Track");
  const [ticket, setTicket] = useState<TrackedTicket | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    // `poll` closes over `timer` before it exists, but that's TDZ-safe here:
    // the only read is inside the async gap after `await fetchStatus`, which
    // never runs before the synchronous `const timer = setInterval(...)`
    // below has already executed.
    async function poll() {
      const data = await fetchStatus(slug, orderId);
      if (cancelled) return;
      setTicket(data);
      // No RLS/realtime path exists for an anonymous visitor (orders has no
      // public SELECT policy, deliberately — see the API route), so polling
      // is the whole mechanism here, not a fallback the way it is on staff
      // dashboards. Stop once the order can never change again — no point
      // hammering a served or cancelled ticket every 10s for the rest of the
      // tab's life.
      if (data && (data.status === "served" || data.status === "cancelled")) {
        clearInterval(timer);
      }
    }

    poll();
    const timer = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [slug, orderId]);

  if (ticket === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <Clock className="size-8 animate-pulse" />
        <p className="text-sm font-medium">{t("loading")}</p>
      </div>
    );
  }

  if (ticket === null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
        <XCircle className="size-8 text-muted-foreground" />
        <p className="font-medium">{t("notFound")}</p>
        <Link href={`/${slug}/menu`} className="mt-2 text-sm font-semibold text-primary underline">
          {t("backToMenu")}
        </Link>
      </div>
    );
  }

  if (ticket.status === "cancelled") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
        <XCircle className="size-8 text-destructive" />
        <p className="font-medium">{t("cancelled")}</p>
        <Link href={`/${slug}/menu`} className="mt-2 text-sm font-semibold text-primary underline">
          {t("backToMenu")}
        </Link>
      </div>
    );
  }

  const activeStep = stepIndex(ticket.status);

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {restaurantName}
        </p>
        <h1 className="mt-1 font-display text-2xl font-black">
          #{ticket.id.slice(0, 5).toUpperCase()}
        </h1>
        {ticket.table_number && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("table", { table: ticket.table_number })}
          </p>
        )}
      </div>

      {/* Progress rail */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < activeStep;
          const current = i === activeStep;
          return (
            <div key={step.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      done || current ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <motion.div
                  animate={current ? { scale: [1, 1.12, 1] } : {}}
                  transition={current ? { repeat: Infinity, duration: 1.8 } : {}}
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border-2",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : current
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      done ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  "text-center text-[11px] font-bold leading-tight",
                  current ? "text-primary" : "text-muted-foreground",
                )}
              >
                {t(step.label)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Kitchen-ticket look — this is the guest's own receipt of what they
          ordered, mirroring the same "one card per order" idea as the
          KDS ticket the kitchen works from (kds-view.tsx), just without the
          station grouping or the bump button. The perforated top edge and
          monospace quantities are the only things borrowed from that visual
          language; everything price-related stays off, same as the API. */}
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div
          aria-hidden="true"
          className="h-3 w-full bg-[radial-gradient(circle_at_6px_0,transparent_6px,var(--card)_6.5px)] bg-[length:12px_12px] bg-repeat-x"
        />
        <div className="px-5 pb-5 pt-1">
          <div className="flex items-baseline justify-between border-b border-dashed pb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("itemsHeading")}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              #{ticket.id.slice(0, 5).toUpperCase()}
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-dashed">
            {ticket.items.map((line, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5">
                <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                  {line.quantity}×
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{line.name}</p>
                  {line.options.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {line.options.map((opt) => `— ${opt}`).join("  ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {ticket.status === "served" && (
        <button
          onClick={() => {
            forgetOrder(ticket.id);
          }}
          className="text-center text-xs font-semibold text-muted-foreground underline"
        >
          {t("dismiss")}
        </button>
      )}

      <Link
        href={`/${slug}/menu`}
        className="text-center text-sm font-semibold text-primary underline"
      >
        {t("backToMenu")}
      </Link>
    </div>
  );
}
