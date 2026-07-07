import "server-only";
import type { Subscription } from "@/lib/types";

/**
 * Provider seam for subscription billing. Stripe cannot onboard
 * Morocco-based merchants and the pilot bills in MAD, so ManualBillingProvider
 * is the only implementation today — plan/status/trial changes are made
 * directly by the super admin (api/admin/restaurants/[id] and
 * api/admin/subscriptions/[id]). A future StripeBillingProvider or local PSP
 * (CMI) slots in here without changing the admin routes that call it; the
 * `provider*` columns on `subscriptions` already exist for it.
 */
export interface BillingProvider {
  createSubscription(restaurantId: string, planTier: Subscription["plan_tier"]): Promise<void>;
  changePlan(restaurantId: string, planTier: Subscription["plan_tier"]): Promise<void>;
  cancel(restaurantId: string): Promise<void>;
}

export class ManualBillingProvider implements BillingProvider {
  async createSubscription(): Promise<void> {
    // No-op: the subscriptions row is created directly by
    // POST /api/admin/restaurants — there is no external system to notify.
  }

  async changePlan(): Promise<void> {
    // No-op: PATCH /api/admin/restaurants/[id] writes plan_tier directly.
  }

  async cancel(): Promise<void> {
    // No-op: PATCH /api/admin/restaurants/[id] writes status directly.
  }
}

export const billingProvider: BillingProvider = new ManualBillingProvider();
