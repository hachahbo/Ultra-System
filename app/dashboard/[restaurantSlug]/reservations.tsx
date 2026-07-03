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
import { Phone, Users, CalendarDays } from 'lucide-react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { fetchReservations, patchReservation } from '../../../lib/api';
import type { ReservationRecord, ReservationStatus } from '../../../types/orders';

const STATUS_COLOR: Record<ReservationStatus, string> = {
  nouveau: '#F2C94C',
  'confirmé': '#27AE60',
  'annulé': '#EB5757',
};

// ─── Screen: Reservations ─────────────────────────────────────────────────────

export default function ReservationsBoard(): JSX.Element {
  const { restaurantSlug } = useLocalSearchParams<{ restaurantSlug: string }>();
  const token = useAuthStore((s) => s.token);

  const [rows, setRows]       = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [busyId, setBusyId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { reservations } = await fetchReservations(restaurantSlug, token);
      setRows(reservations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [restaurantSlug, token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  async function setStatus(row: ReservationRecord, status: ReservationStatus): Promise<void> {
    if (!token || row.status === status) return;
    setBusyId(row._recordId);
    setRows((prev) => prev.map((r) => (r._recordId === row._recordId ? { ...r, status } : r)));
    try {
      await patchReservation(restaurantSlug, row._recordId, status, token);
    } catch {
      load();
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

      {rows.length === 0 ? (
        <Text style={styles.empty}>Aucune réservation pour le moment.</Text>
      ) : (
        rows.map((row) => (
          <View key={row._recordId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.customer}>{row.customer_name}</Text>
              <View style={[styles.chip, { backgroundColor: STATUS_COLOR[row.status] }]}>
                <Text style={styles.chipText}>{row.status}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <CalendarDays size={14} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.meta}>
                {row.date} à {row.time}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Users size={14} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.meta}>{row.party_size} personne(s)</Text>
            </View>
            <View style={styles.metaRow}>
              <Phone size={14} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.meta}>{row.customer_phone}</Text>
            </View>
            {row.notes ? <Text style={styles.notes}>{row.notes}</Text> : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={() => setStatus(row, 'confirmé')}
                disabled={busyId === row._recordId}
              >
                <Text style={styles.confirmText}>Confirmer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setStatus(row, 'annulé')}
                disabled={busyId === row._recordId}
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
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
    marginBottom: 4,
  },
  customer: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontSize: 14, color: COLORS.textPrimary },
  notes: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#27AE60' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  cancelBtn: { backgroundColor: '#FDECEA' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#EB5757' },
});
