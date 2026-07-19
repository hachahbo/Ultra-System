// Pure MRR/churn/ARPU math, extracted from src/app/api/admin/analytics/route.ts
// so it's unit-testable without spinning up a route handler + DB. No "server-only"
// import here on purpose — nothing in this file touches Supabase or Next.js.

export type SubscriptionForMath = {
  restaurant_id: string;
  status: "active" | "trialing" | "past_due" | "canceled";
  billing_cycle: string;
  price_mad: number | string;
  created_at: string;
  canceled_at: string | null;
};

/** Yearly billing normalized down to a monthly figure. */
export function monthlyPrice(priceMad: number, billingCycle: string): number {
  return billingCycle === "yearly" ? priceMad / 12 : priceMad;
}

function sumMonthly(subs: SubscriptionForMath[]): number {
  return subs.reduce((sum, s) => sum + monthlyPrice(Number(s.price_mad), s.billing_cycle), 0);
}

export function isActiveOrTrialing(s: SubscriptionForMath): boolean {
  return s.status === "active" || s.status === "trialing";
}

export type FinancialSummary = {
  mrr: number;
  mrrGrowthPct: number | null;
  churnRatePct: number;
  arpu: number;
  pendingRevenue: number;
  failedPaymentsCount: number;
  activeSubscriptionsCount: number;
};

/**
 * All the financial KPIs on the admin overview, computed from one pass over
 * every subscription row plus a "since" cutoff for the rolling period
 * (typically now - 30 days).
 *
 * mrrGrowthPct is null when there's no meaningful previous-period MRR to
 * compare against (e.g. a brand new platform) — the UI renders "—" for that,
 * never a fabricated 0% or Infinity.
 */
export function computeFinancialSummary(
  subs: SubscriptionForMath[],
  periodStart: Date,
): FinancialSummary {
  const activeSubs = subs.filter(isActiveOrTrialing);
  const mrr = sumMonthly(activeSubs);

  const newSubs = activeSubs.filter((s) => new Date(s.created_at) >= periodStart);
  const newMRR = sumMonthly(newSubs);

  const canceledThisPeriod = subs.filter(
    (s) => s.status === "canceled" && s.canceled_at !== null && new Date(s.canceled_at) >= periodStart,
  );
  const churnedMRR = sumMonthly(canceledThisPeriod);

  const prevMRR = mrr - newMRR + churnedMRR;
  const mrrGrowthPct = prevMRR > 0 ? ((newMRR - churnedMRR) / prevMRR) * 100 : null;

  const activeAtStart = activeSubs.length + canceledThisPeriod.length;
  const churnRatePct = activeAtStart > 0 ? (canceledThisPeriod.length / activeAtStart) * 100 : 0;

  const arpu = activeSubs.length > 0 ? mrr / activeSubs.length : 0;

  const pastDueSubs = subs.filter((s) => s.status === "past_due");
  const pendingRevenue = sumMonthly(pastDueSubs);

  return {
    mrr,
    mrrGrowthPct,
    churnRatePct,
    arpu,
    pendingRevenue,
    failedPaymentsCount: pastDueSubs.length,
    activeSubscriptionsCount: activeSubs.length,
  };
}
