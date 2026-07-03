import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Slot, useLocalSearchParams } from 'expo-router';
import { useFetchMenu } from '../../hooks/useFetchMenu';
import { useCartStore } from '../../store/useCartStore';
import { SiteHeader } from '../../components/SiteHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteParams = {
  restaurantSlug: string;
  table?: string;
};

// ─── Layout ───────────────────────────────────────────────────────────────────

/**
 * Shell for the whole restaurant site (Home / Menu / Réservation / À propos /
 * Checkout). Fetches the menu ONCE here so every child page has restaurant data,
 * enforces `is_active`, and renders the shared top nav.
 */
export default function RestaurantLayout(): JSX.Element {
  const { restaurantSlug, table } = useLocalSearchParams<RouteParams>();

  const setTableId    = useCartStore((s) => s.setTableId);
  const isMenuLoading = useCartStore((s) => s.isMenuLoading);
  const menuError     = useCartStore((s) => s.menuError);
  const menuPayload   = useCartStore((s) => s.menuPayload);

  // Persist the invisible ?table= param for the WhatsApp/order context.
  useEffect(() => {
    setTableId(table ?? null);
  }, [table, setTableId]);

  // Fetch restaurant + menu for this slug (resets stale state on slug change).
  useFetchMenu(restaurantSlug);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isMenuLoading || (!menuPayload && !menuError)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (menuError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Oops, une erreur est survenue.</Text>
        <Text style={styles.muted}>{menuError}</Text>
      </View>
    );
  }

  if (!menuPayload) return <View style={styles.screen} />;

  // ── is_active guard ────────────────────────────────────────────────────────
  if (!menuPayload.restaurant.is_active) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Restaurant indisponible</Text>
        <Text style={styles.muted}>
          Ce restaurant n'accepte pas de commandes pour le moment.
        </Text>
      </View>
    );
  }

  // ── Site shell ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <SiteHeader
        slug={restaurantSlug}
        restaurantName={menuPayload.restaurant.restaurant_name}
      />
      <Slot />
    </View>
  );
}

// ─── Tokens & styles ──────────────────────────────────────────────────────────

const COLORS = {
  accent: '#FF6B35',
  background: '#F8F8F8',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  errorTitle: '#C0392B',
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 10,
    padding: 24,
  },
  muted: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.errorTitle,
    textAlign: 'center',
  },
});
