import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCartStore } from '../../store/useCartStore';
import { CategoryTabs } from '../../components/CategoryTabs';
import { ProductCard } from '../../components/ProductCard';
import { StickyCartFooter } from '../../components/StickyCartFooter';

// ─── Screen ───────────────────────────────────────────────────────────────────
// Restaurant + menu are fetched by the parent layout; this screen only reads the
// hydrated payload from the store and renders the category-filtered product list.

export default function MenuScreen(): JSX.Element | null {
  const menuPayload = useCartStore((s) => s.menuPayload);
  const tableId     = useCartStore((s) => s.tableId);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Auto-select the first category once the payload is available.
  useEffect(() => {
    if (menuPayload && activeCategoryId === null) {
      setActiveCategoryId(menuPayload.categories[0]?.category_id ?? null);
    }
  }, [menuPayload, activeCategoryId]);

  if (!menuPayload) return null;

  const activeCategory = menuPayload.categories.find(
    (cat) => cat.category_id === activeCategoryId
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* child 0: menu title + table label */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Notre Menu</Text>
          {tableId ? <Text style={styles.tableLabel}>Table N°{tableId}</Text> : null}
        </View>

        {/* child 1: sticky category tabs */}
        <CategoryTabs
          categories={menuPayload.categories}
          activeCategoryId={activeCategoryId ?? ''}
          onSelectCategory={setActiveCategoryId}
        />

        {/* child 2: product list / empty state */}
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

      <StickyCartFooter />
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
  border: '#E8E8E8',
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  titleRow: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tableLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  productList: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 16,
  },
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
