import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ShoppingBag, Wallet } from 'lucide-react-native';
import { useCartStore } from '../../store/useCartStore';
import { submitOrder } from '../../lib/api';
import type { OrderLineInput } from '../../types/orders';

// ─── Screen: Checkout (Cash on Delivery, livraison) ───────────────────────────

export default function CheckoutScreen(): JSX.Element {
  const { restaurantSlug } = useLocalSearchParams<{ restaurantSlug: string }>();
  const router = useRouter();

  const lines          = useCartStore((s) => s.lines);
  const subtotal       = useCartStore((s) => s.subtotal);
  const deliveryFee    = useCartStore((s) => s.deliveryFee);
  const total          = useCartStore((s) => s.total);
  const totalItemCount = useCartStore((s) => s.totalItemCount);
  const clearCart      = useCartStore((s) => s.clearCart);

  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes]     = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [orderId, setOrderId]       = useState<string | null>(null);

  const canSubmit =
    name.trim() && phone.trim() && address.trim() && totalItemCount > 0;

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const orderLines: OrderLineInput[] = lines.map((l) => ({
        name_fr: l.item.name_fr,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        modifiers: l.selectedModifiers.map((m) => m.option_name_fr),
      }));

      const { order_id } = await submitOrder({
        restaurant_slug: restaurantSlug,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        delivery_address: address.trim(),
        lines: orderLines,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        notes: notes.trim() || undefined,
      });

      setOrderId(order_id);
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la commande.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (orderId) {
    return (
      <View style={styles.successWrap}>
        <View style={styles.successIcon}>
          <Check size={32} color="#FFFFFF" strokeWidth={3} />
        </View>
        <Text style={styles.successTitle}>Commande confirmée !</Text>
        <Text style={styles.successRef}>N° {orderId}</Text>
        <Text style={styles.successBody}>
          Le restaurant prépare votre commande. Paiement en espèces à la livraison.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace(`/${restaurantSlug}`)}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty cart ─────────────────────────────────────────────────────────────
  if (totalItemCount === 0) {
    return (
      <View style={styles.emptyWrap}>
        <ShoppingBag size={40} color={COLORS.textSecondary} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>Votre panier est vide</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.replace({ pathname: '/[restaurantSlug]/menu', params: { restaurantSlug } })
          }
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>Voir le menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form + summary ───────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Finaliser la commande</Text>

      {/* Order summary */}
      <View style={styles.summary}>
        {lines.map((l) => (
          <View key={l.cartLineId} style={styles.summaryLine}>
            <Text style={styles.summaryQty}>{l.quantity}×</Text>
            <View style={styles.summaryMid}>
              <Text style={styles.summaryName}>{l.item.name_fr}</Text>
              {l.selectedModifiers.length > 0 && (
                <Text style={styles.summaryMods}>
                  {l.selectedModifiers.map((m) => m.option_name_fr).join(', ')}
                </Text>
              )}
            </View>
            <Text style={styles.summaryPrice}>
              {(l.unitPrice * l.quantity).toFixed(2)} DH
            </Text>
          </View>
        ))}

        <View style={styles.divider} />
        <SummaryRow label="Sous-total" value={`${subtotal.toFixed(2)} DH`} />
        <SummaryRow label="Livraison" value={`${deliveryFee.toFixed(2)} DH`} />
        <SummaryRow label="Total" value={`${total.toFixed(2)} DH`} strong />
      </View>

      {/* Delivery details */}
      <Text style={styles.sectionTitle}>Livraison</Text>

      <Field label="Nom complet *">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Votre nom"
          placeholderTextColor={COLORS.placeholder}
        />
      </Field>
      <Field label="Téléphone *">
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="06 XX XX XX XX"
          placeholderTextColor={COLORS.placeholder}
          keyboardType="phone-pad"
        />
      </Field>
      <Field label="Adresse de livraison *">
        <TextInput
          style={[styles.input, styles.textarea]}
          value={address}
          onChangeText={setAddress}
          placeholder="Rue, quartier, étage, repères…"
          placeholderTextColor={COLORS.placeholder}
          multiline
        />
      </Field>
      <Field label="Remarques">
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="Instructions pour le livreur…"
          placeholderTextColor={COLORS.placeholder}
        />
      </Field>

      {/* Payment method (COD only) */}
      <View style={styles.payment}>
        <Wallet size={18} color={COLORS.accent} strokeWidth={2} />
        <Text style={styles.paymentText}>Paiement en espèces à la livraison</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || submitting}
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>Confirmer — {total.toFixed(2)} DH</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): JSX.Element {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryRowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.summaryRowValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

// ─── Tokens & styles ──────────────────────────────────────────────────────────

const COLORS = {
  accent: '#FF6B35',
  background: '#F8F8F8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E0E0E0',
  placeholder: '#B0B0B0',
  error: '#C0392B',
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },

  // Summary
  summary: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  summaryQty: { fontSize: 14, fontWeight: '700', color: COLORS.accent, minWidth: 26 },
  summaryMid: { flex: 1 },
  summaryName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  summaryMods: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  summaryPrice: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryRowLabel: { fontSize: 14, color: COLORS.textSecondary },
  summaryRowValue: { fontSize: 14, color: COLORS.textPrimary },
  strong: { fontWeight: '800', color: COLORS.textPrimary, fontSize: 16 },

  // Form
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  textarea: { minHeight: 70, textAlignVertical: 'top' },

  payment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF3EE',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  paymentText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },

  error: { color: COLORS.error, fontSize: 14 },
  submit: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Success / empty
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: COLORS.background,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  successRef: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  successBody: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 14,
    backgroundColor: COLORS.background,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  backButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  backButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
