import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import type { CategoryWithItems } from '../types/airtable';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryTabsProps {
  categories: CategoryWithItems[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CategoryTabs({
  categories,
  activeCategoryId,
  onSelectCategory,
}: CategoryTabsProps): JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const isActive = cat.category_id === activeCategoryId;
        return (
          <TouchableOpacity
            key={cat.category_id}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelectCategory(cat.category_id)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={cat.name_fr}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {cat.name_fr}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLORS = {
  accent: '#FF6B35',
  activePillBg: '#FF6B35',
  activePillText: '#FFFFFF',
  inactivePillBg: '#F0F0F0',
  inactivePillText: '#4A4A4A',
} as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.inactivePillBg,
  },
  pillActive: {
    backgroundColor: COLORS.activePillBg,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.inactivePillText,
  },
  pillTextActive: {
    color: COLORS.activePillText,
    fontWeight: '700',
  },
});
