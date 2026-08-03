import "server-only";
import type { Order } from "@/lib/types";

/**
 * Provider seam for customer-facing order payment (distinct from
 * src/lib/billing/provider.ts, which is restaurant → platform SaaS billing).
 * Cash on Delivery needs no provider — orderSchema restricts checkout to
 * `payment_method: 'cash' | 'card_on_delivery'` today (Phase 8.1;
 * ROADMAP-PHASE8.md §2.4). Online card payment via CMI is externally
 * blocked on Moroccan merchant onboarding; this interface is the config
 * swap for when that clears, with zero call-site churn.
 */
export interface PaymentProvider {
  createCheckout(order: Pick<Order, "id" | "restaurant_id" | "total">): Promise<{ redirectUrl: string }>;
  verifyWebhook(request: Request): Promise<{ orderId: string; paid: boolean } | null>;
}

export class UnavailablePaymentProvider implements PaymentProvider {
  async createCheckout(): Promise<{ redirectUrl: string }> {
    throw new PaymentProviderUnavailableError();
  }

  async verifyWebhook(): Promise<{ orderId: string; paid: boolean } | null> {
    throw new PaymentProviderUnavailableError();
  }
}

export class PaymentProviderUnavailableError extends Error {
  readonly status = 501;
  constructor() {
    super("Online payment is not available yet (CMI merchant onboarding pending)");
  }
}

export const paymentProvider: PaymentProvider = new UnavailablePaymentProvider();
