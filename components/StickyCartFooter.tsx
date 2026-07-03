import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, ShoppingBag } from 'lucide-react-native';
import { useCartStore } from '../store/useCartStore';

// ─── Component ────────────────────────────────────────────────────────────────

export function StickyCartFooter(): JSX.Element | null {
  const router = useRouter();
  const { restaurantSlug } = useLocalSearchParams<{ restaurantSlug: string }>();
  const total = useCartStore((s) => s.total);
  const totalItemCount = useCartStore((s) => s.totalItemCount);

  // Nothing in the cart — render nothing so the menu is fully visible.
  if (totalItemCount === 0) return null;

  function handleCheckout(): void {
    router.push({ pathname: '/[restaurantSlug]/checkout', params: { restaurantSlug } });
  }

  const articleLabel = totalItemCount === 1 ? 'article' : 'articles';

  return (
    <View style={styles.wrapper}>
      {/* ── Row ─────────────────────────────────────────────────────────── */}
      <View style={styles.row}>

        {/* Left: dark info pill — bag icon + count + total */}
        <View style={styles.infoPill}>
          <ShoppingBag size={16} color={COLORS.white} strokeWidth={2} />
          <Text style={styles.articleCount}>
            {totalItemCount} {articleLabel}
          </Text>
          <View style={styles.pillDivider} />
          <Text style={styles.pillTotal}>{total.toFixed(2)} DH</Text>
        </View>

        {/* Right: "Commander" CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleCheckout}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Commander — ${total.toFixed(2)} DH`}
        >
          <Text style={styles.ctaText}>Commander</Text>
          <ArrowRight size={16} color={COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLORS = {
  accent: '#FF6B35',
  white: '#FFFFFF',
  footerBg: '#FFFFFF',
  infoPillBg: '#1A1A1A',
  divider: 'rgba(255,255,255,0.25)',
} as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.footerBg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32, // home indicator clearance on iOS
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    // Elevation — casts shadow upward so it reads as floating above the list
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // ── Dark info pill ────────────────────────────────────────────────────────
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoPillBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexShrink: 1, // give space to the CTA first
  },
  articleCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  pillDivider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.divider,
  },
  pillTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },

  // ── CTA button ────────────────────────────────────────────────────────────
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
