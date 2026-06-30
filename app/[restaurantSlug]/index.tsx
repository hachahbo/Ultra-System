import React, { useEffect, useState } from 'react';
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
import { CategoryTabs } from '../../components/CategoryTabs';
import { ProductCard } from '../../components/ProductCard';
import { StickyCartFooter } from '../../components/StickyCartFooter';

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteParams = {
  restaurantSlug: string;
  table?: string;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MenuScreen(): JSX.Element | null {
  const { restaurantSlug, table } = useLocalSearchParams<RouteParams>();

  // Selective subscriptions — cart mutations do not re-render this screen
  const setTableId    = useCartStore((s) => s.setTableId);
  const isMenuLoading = useCartStore((s) => s.isMenuLoading);
  const menuError     = useCartStore((s) => s.menuError);
  const menuPayload   = useCartStore((s) => s.menuPayload);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Write the table ID into the store so the WhatsApp engine can read it
  // without it being passed through every component in the tree.
  useEffect(() => {
    setTableId(table ?? null);
  }, [table, setTableId]);

  // Auto-select the first category once the payload arrives.
  // The null-guard prevents this from overwriting the user's active tab
  // if the component ever re-mounts while a payload is already in the store.
  useEffect(() => {
    if (menuPayload && activeCategoryId === null) {
      setActiveCategoryId(menuPayload.categories[0]?.category_id ?? null);
    }
  }, [menuPayload, activeCategoryId]);

  // Trigger the Airtable fetch sequence for this slug.
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

  // ── Guard: payload not yet hydrated ───────────────────────────────────────

  if (!menuPayload) return null;

  const { restaurant } = menuPayload;

  // Find the items for the currently selected tab.
  // Falls back to undefined (renders an empty list) during the one-frame
  // window before the auto-select effect fires.
  const activeCategory = menuPayload.categories.find(
    (cat) => cat.category_id === activeCategoryId
  );

  // ── Loaded ─────────────────────────────────────────────────────────────────

  return (
    // Outer View gives StickyCartFooter a bounded stacking context while
    // the ScrollView fills the remaining vertical space.
    <View style={styles.screen}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // child index 1 (CategoryTabs) is pinned below the header as the
        // user scrolls through a long product list.
        stickyHeaderIndices={[1]}
      >

        {/* ── child 0: Restaurant header ──────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.restaurantName}>{restaurant.restaurant_name}</Text>
          {table ? (
            <Text style={styles.tableLabel}>Table N°{table}</Text>
          ) : null}
        </View>

        {/* ── child 1: Category tabs (sticky) ─────────────────────────────── */}
        <CategoryTabs
          categories={menuPayload.categories}
          activeCategoryId={activeCategoryId ?? ''}
          onSelectCategory={setActiveCategoryId}
        />

        {/* ── child 2: Product list ────────────────────────────────────────── */}
        <View style={styles.productList}>
          {activeCategory && activeCategory.items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>Aucun article disponible</Text>
              <Text style={styles.emptyBody}>
                Cette catégorie ne contient pas encore d'articles.
              </Text>
            </View>
          ) : (
            activeCategory?.items.map((item) => (
              <ProductCard key={item.item_id} item={item} />
            ))
          )}
        </View>

      </ScrollView>

      {/* Rendered as a sibling of the ScrollView so it sits in the same
          flex column but floats over the content via position:absolute.
          This prevents the ScrollView from compressing when the footer
          is visible — the absolute footer overlaps, not displaces. */}
      <StickyCartFooter />

    </View>
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
  // ── Full-screen fallback states ───────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
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

  // ── Loaded layout ──────────────────────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 120, // keeps the last card above the StickyCartFooter
  },

  // ── Restaurant header ──────────────────────────────────────────────────────
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

  // ── Product list ───────────────────────────────────────────────────────────
  productList: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 16,
  },

  // ── Empty category state ───────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
