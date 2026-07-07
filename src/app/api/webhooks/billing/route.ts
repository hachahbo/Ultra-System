import { apiError } from "@/lib/api";

// Stub: no billing provider with webhooks exists yet for this pilot (Stripe
// cannot onboard Morocco-based merchants; billing is manual — see
// src/lib/billing/provider.ts). Building webhook signature verification for
// a provider that can't be used would be dead code. When a real provider
// (Stripe/CMI) is integrated, replace this with its webhook handler.
export async function POST() {
  return apiError("no_provider", "Aucun fournisseur de paiement configuré", 501);
}
