import { describe, expect, it } from "vitest";
import { computeFinancialSummary, isActiveOrTrialing, monthlyPrice, type SubscriptionForMath } from "./analytics-math";

const PERIOD_START = new Date("2026-06-19T00:00:00Z"); // 30 days back from a nominal "now" of 2026-07-19

function sub(overrides: Partial<SubscriptionForMath> = {}): SubscriptionForMath {
  return {
    restaurant_id: "r1",
    status: "active",
    billing_cycle: "monthly",
    price_mad: 499,
    created_at: "2026-01-01T00:00:00Z",
    canceled_at: null,
    ...overrides,
  };
}

describe("monthlyPrice", () => {
  it("returns the price as-is for monthly billing", () => {
    expect(monthlyPrice(499, "monthly")).toBe(499);
  });
  it("divides yearly billing by 12", () => {
    expect(monthlyPrice(12000, "yearly")).toBe(1000);
  });
});

describe("isActiveOrTrialing", () => {
  it("is true for active and trialing", () => {
    expect(isActiveOrTrialing(sub({ status: "active" }))).toBe(true);
    expect(isActiveOrTrialing(sub({ status: "trialing" }))).toBe(true);
  });
  it("is false for past_due and canceled", () => {
    expect(isActiveOrTrialing(sub({ status: "past_due" }))).toBe(false);
    expect(isActiveOrTrialing(sub({ status: "canceled" }))).toBe(false);
  });
});

describe("computeFinancialSummary", () => {
  it("sums MRR across active + trialing, normalizing yearly billing", () => {
    const subs = [
      sub({ status: "active", price_mad: 499, billing_cycle: "monthly" }),
      sub({ status: "trialing", price_mad: 0, billing_cycle: "monthly" }),
      sub({ status: "active", price_mad: 12000, billing_cycle: "yearly" }), // -> 1000/mo
      sub({ status: "canceled", price_mad: 499, billing_cycle: "monthly" }), // excluded
    ];
    const result = computeFinancialSummary(subs, PERIOD_START);
    expect(result.mrr).toBe(1499);
    // active + trialing + yearly-active = 3 (canceled is excluded).
    expect(result.activeSubscriptionsCount).toBe(3);
  });

  it("computes ARPU as mrr / active count, 0 when no active subs", () => {
    expect(computeFinancialSummary([], PERIOD_START).arpu).toBe(0);
    const subs = [sub({ price_mad: 500 }), sub({ price_mad: 1500 })];
    expect(computeFinancialSummary(subs, PERIOD_START).arpu).toBe(1000);
  });

  it("computes pendingRevenue + failedPaymentsCount from past_due subs only", () => {
    const subs = [
      sub({ status: "past_due", price_mad: 499 }),
      sub({ status: "past_due", price_mad: 12000, billing_cycle: "yearly" }),
      sub({ status: "active", price_mad: 500 }),
    ];
    const result = computeFinancialSummary(subs, PERIOD_START);
    expect(result.pendingRevenue).toBe(499 + 1000);
    expect(result.failedPaymentsCount).toBe(2);
  });

  it("mrrGrowthPct is null when there's no meaningful previous-period MRR (never fabricates 0 or Infinity)", () => {
    // Everything active was created inside the period -> prevMRR <= 0.
    const subs = [sub({ status: "active", created_at: "2026-07-01T00:00:00Z", price_mad: 500 })];
    const result = computeFinancialSummary(subs, PERIOD_START);
    expect(result.mrrGrowthPct).toBeNull();
  });

  it("mrrGrowthPct reflects new minus churned MRR against the previous baseline", () => {
    const subs = [
      // Existing, unchanged through the period.
      sub({ status: "active", created_at: "2026-01-01T00:00:00Z", price_mad: 1000 }),
      // New this period: +500 MRR.
      sub({ status: "active", created_at: "2026-07-10T00:00:00Z", price_mad: 500 }),
      // Churned this period: -300 MRR (was part of prevMRR).
      sub({ status: "canceled", created_at: "2026-01-01T00:00:00Z", canceled_at: "2026-07-05T00:00:00Z", price_mad: 300 }),
    ];
    const result = computeFinancialSummary(subs, PERIOD_START);
    // mrr = 1000 + 500 = 1500; newMRR = 500; churnedMRR = 300
    // prevMRR = 1500 - 500 + 300 = 1300; growth = (500-300)/1300*100
    expect(result.mrr).toBe(1500);
    expect(result.mrrGrowthPct).toBeCloseTo((200 / 1300) * 100, 5);
  });

  it("churnRatePct is canceled-this-period / (active-now + canceled-this-period)", () => {
    const subs = [
      sub({ status: "active" }),
      sub({ status: "active" }),
      sub({ status: "canceled", canceled_at: "2026-07-10T00:00:00Z" }),
    ];
    const result = computeFinancialSummary(subs, PERIOD_START);
    // activeAtStart = 2 + 1 = 3; churnRate = 1/3 * 100
    expect(result.churnRatePct).toBeCloseTo(100 / 3, 5);
  });

  it("churnRatePct is 0 when there are no subscriptions at all", () => {
    expect(computeFinancialSummary([], PERIOD_START).churnRatePct).toBe(0);
  });

  it("ignores canceled subs with a null canceled_at for churn math (pre-migration data safety net)", () => {
    const subs = [
      sub({ status: "active" }),
      sub({ status: "canceled", canceled_at: null }),
    ];
    const result = computeFinancialSummary(subs, PERIOD_START);
    // The null-canceled_at row must not count as "canceled this period".
    expect(result.churnRatePct).toBe(0);
  });
});
