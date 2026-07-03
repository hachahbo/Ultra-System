import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Phone, MapPin } from 'lucide-react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { fetchOrders, patchOrder } from '../../../lib/api';
import { ORDER_STATUSES, type OrderRecord, type OrderStatus } from '../../../types/orders';

// ─── Status chip colours ──────────────────────────────────────────────────────

const STATUS_COLOR: Record<OrderStatus, string> = {
  nouveau: '#F2C94C',
  'confirmé': '#2D9CDB',
  'en préparation': '#F2994A',
  'en livraison': '#9B51E0',
  'livré': '#27AE60',
  'annulé': '#EB5757',
};

// ─── Screen: Orders board ─────────────────────────────────────────────────────

export default function OrdersBoard(): JSX.Element {
  const { restaurantSlug } = useLocalSearchParams<{ restaurantSlug: string }>();
  const token = useAuthStore((s) => s.token);

  const [orders, setOrders]   = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [busyId, setBusyId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { orders } = await fetchOrders(restaurantSlug, token);
      setOrders(orders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [restaurantSlug, token]);

  // Initial load + light auto-refresh so new orders appear.
  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  async function updateStatus(order: OrderRecord, status: OrderStatus): Promise<void> {
    if (!token || order.status === status) return;
    setBusyId(order._recordId);
    // Optimistic update.
    setOrders((prev) =>
      prev.map((o) => (o._recordId === order._recordId ? { ...o, status } : o))
    );
    try {
      await patchOrder(restaurantSlug, order._recordId, status, token);
    } catch {
      load(); // revert to server truth on failure
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {orders.length === 0 ? (
        <Text style={styles.empty}>Aucune commande pour le moment.</Text>
      ) : (
        orders.map((order) => (
          <View key={order._recordId} style={styles.card}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>{order.order_id}</Text>
              <View style={[styles.chip, { backgroundColor: STATUS_COLOR[order.status] }]}>
                <Text style={styles.chipText}>{order.status}</Text>
              </View>
            </View>

            {/* Customer */}
            <Text style={styles.customer}>{order.customer_name}</Text>
            <View style={styles.metaRow}>
              <Phone size={13} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.meta}>{order.customer_phone}</Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={13} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.meta}>{order.delivery_address}</Text>
            </View>

            {/* Items */}
            <Text style={styles.items}>{order.items_summary}</Text>

            {/* Totals */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total (COD)</Text>
              <Text style={styles.totalValue}>{order.total.toFixed(2)} DH</Text>
            </View>

            {/* Status actions */}
            <View style={styles.statusRow}>
              {ORDER_STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, order.status === s && styles.statusBtnActive]}
                  onPress={() => updateStatus(order, s)}
                  disabled={busyId === order._recordId}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      order.status === s && styles.statusBtnTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Tokens & styles ──────────────────────────────────────────────────────────

const COLORS = {
  accent: '#FF6B35',
  background: '#F1F1F3',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E4E4E7',
  error: '#C0392B',
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 15 },
  error: { color: COLORS.error, fontSize: 14 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  orderId: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  customer: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  items: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
    marginTop: 6,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  statusBtnActive: { backgroundColor: COLORS.accent },
  statusBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  statusBtnTextActive: { color: '#FFFFFF' },
});
