import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useFetchMenu } from '../../../hooks/useFetchMenu';
import { useCartStore } from '../../../store/useCartStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { patchItem } from '../../../lib/api';

// ─── Local editable row shape ─────────────────────────────────────────────────

interface EditRow {
  recordId: string;
  item_id: string;
  name_fr: string;
  category_name: string;
  in_stock: boolean;
  priceText: string;
  savedPrice: number;
  saving: boolean;
}

// ─── Screen: Menu editor ──────────────────────────────────────────────────────

export default function MenuEditor(): JSX.Element {
  const { restaurantSlug } = useLocalSearchParams<{ restaurantSlug: string }>();
  const token = useAuthStore((s) => s.token);

  // Reuse the customer menu fetch to hydrate the store with this slug's items.
  useFetchMenu(restaurantSlug);
  const menuPayload   = useCartStore((s) => s.menuPayload);
  const isMenuLoading = useCartStore((s) => s.isMenuLoading);

  const [rows, setRows] = useState<EditRow[]>([]);

  // Sync local editable rows whenever the payload changes.
  useEffect(() => {
    if (!menuPayload) return;
    const flat: EditRow[] = menuPayload.categories.flatMap((cat) =>
      cat.items.map((item) => ({
        recordId: item._recordId,
        item_id: item.item_id,
        name_fr: item.name_fr,
        category_name: cat.name_fr,
        in_stock: item.in_stock,
        priceText: item.base_price.toFixed(2),
        savedPrice: item.base_price,
        saving: false,
      }))
    );
    setRows(flat);
  }, [menuPayload]);

  function patch(recordId: string, updater: (r: EditRow) => EditRow): void {
    setRows((prev) => prev.map((r) => (r.recordId === recordId ? updater(r) : r)));
  }

  async function toggleStock(row: EditRow, value: boolean): Promise<void> {
    if (!token) return;
    patch(row.recordId, (r) => ({ ...r, in_stock: value }));
    try {
      await patchItem(restaurantSlug, row.recordId, { in_stock: value }, token);
    } catch {
      patch(row.recordId, (r) => ({ ...r, in_stock: !value })); // revert
    }
  }

  async function savePrice(row: EditRow): Promise<void> {
    if (!token) return;
    const next = Number(row.priceText.replace(',', '.'));
    if (!Number.isFinite(next) || next < 0 || next === row.savedPrice) return;
    patch(row.recordId, (r) => ({ ...r, saving: true }));
    try {
      await patchItem(restaurantSlug, row.recordId, { base_price: next }, token);
      patch(row.recordId, (r) => ({ ...r, savedPrice: next, saving: false }));
    } catch {
      patch(row.recordId, (r) => ({ ...r, saving: false }));
    }
  }

  if (isMenuLoading && rows.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Décochez « En stock » pour masquer un article, ou modifiez son prix.
      </Text>

      {rows.map((row) => {
        const dirty = Number(row.priceText.replace(',', '.')) !== row.savedPrice;
        return (
          <View key={row.recordId} style={styles.card}>
            <View style={styles.cardMain}>
              <Text style={styles.category}>{row.category_name}</Text>
              <Text style={styles.name}>{row.name_fr}</Text>
            </View>

            {/* Price editor */}
            <View style={styles.priceBlock}>
              <TextInput
                style={styles.priceInput}
                value={row.priceText}
                onChangeText={(t) => patch(row.recordId, (r) => ({ ...r, priceText: t }))}
                keyboardType="decimal-pad"
                accessibilityLabel={`Prix de ${row.name_fr}`}
              />
              <Text style={styles.currency}>DH</Text>
              <TouchableOpacity
                style={[styles.saveBtn, !dirty && styles.saveBtnIdle]}
                onPress={() => savePrice(row)}
                disabled={!dirty || row.saving}
                accessibilityLabel="Enregistrer le prix"
              >
                {row.saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                )}
              </TouchableOpacity>
            </View>

            {/* Stock toggle */}
            <View style={styles.stockBlock}>
              <Text style={styles.stockLabel}>{row.in_stock ? 'En stock' : 'Épuisé'}</Text>
              <Switch
                value={row.in_stock}
                onValueChange={(v) => toggleStock(row, v)}
                trackColor={{ true: COLORS.accent, false: '#CCCCCC' }}
              />
            </View>
          </View>
        );
      })}

      <View style={{ height: 32 }} />
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
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  hint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardMain: { gap: 2 },
  category: { fontSize: 11, fontWeight: '600', color: COLORS.accent, textTransform: 'uppercase' },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },

  priceBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: {
    width: 90,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  currency: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnIdle: { backgroundColor: '#D5D5D5' },

  stockBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
});
