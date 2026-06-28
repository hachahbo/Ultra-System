import { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFetchMenu } from '../../hooks/useFetchMenu';
import { useCartStore } from '../../store/useCartStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteParams = {
  restaurantSlug: string;
  table?: string;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MenuScreen(): JSX.Element | null {
  const { restaurantSlug, table } = useLocalSearchParams<RouteParams>();

  // Store actions — selected individually to avoid triggering re-renders from
  // unrelated state slices (e.g. cart mutations).
  const setTableId = useCartStore((s) => s.setTableId);
  const isMenuLoading = useCartStore((s) => s.isMenuLoading);
  const menuError = useCartStore((s) => s.menuError);
  const menuPayload = useCartStore((s) => s.menuPayload);

  // Persist the table ID into the store on mount so the WhatsApp engine
  // can embed it in the order string without prop-drilling.
  useEffect(() => {
    setTableId(table ?? null);
  }, [table, setTableId]);

  // Trigger the full Airtable fetch sequence for this restaurant.
  useFetchMenu(restaurantSlug);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isMenuLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Chargement du menu…</Text>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (menuError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Oops, une erreur est survenue.</Text>
        <Text style={styles.errorBody}>{menuError}</Text>
      </View>
    );
  }

  // ── Guard: payload not yet set (avoids flash before first fetch resolves) ──

  if (!menuPayload) return null;

  const { restaurant } = menuPayload;

  // ── Loaded ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Restaurant header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{restaurant.restaurant_name}</Text>
        {table ? (
          <Text style={styles.tableLabel}>Table N°{table}</Text>
        ) : null}
      </View>

      {/* ── Category tabs ─ placeholder ───────────────────────────────────── */}
      <View style={[styles.placeholder, styles.placeholderTabs]}>
        <Text style={styles.placeholderLabel}>[ Category Tabs ]</Text>
      </View>

      {/* ── Product list ─ placeholder ────────────────────────────────────── */}
      <View style={[styles.placeholder, styles.placeholderList]}>
        <Text style={styles.placeholderLabel}>[ Product List ]</Text>
      </View>

      {/* ── Cart footer ─ placeholder ─────────────────────────────────────── */}
      <View style={[styles.placeholder, styles.placeholderCart]}>
        <Text style={styles.placeholderLabel}>[ Cart Footer ]</Text>
      </View>
    </ScrollView>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLORS = {
  accent: '#FF6B35',
  background: '#F8F8F8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E8E8E8',
  errorTitle: '#C0392B',
  errorBody: '#6B6B6B',
} as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Shared
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
    padding: 24,
  },

  // Loading
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Error
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.errorTitle,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    color: COLORS.errorBody,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loaded — shell
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContent: {
    paddingBottom: 120, // room for the future fixed Cart Footer
  },

  // Restaurant header
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tableLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Placeholders
  placeholder: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTabs: {
    height: 48,
  },
  placeholderList: {
    height: 320,
  },
  placeholderCart: {
    height: 72,
  },
  placeholderLabel: {
    fontSize: 13,
    color: COLORS.border,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
