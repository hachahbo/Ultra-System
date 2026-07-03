import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link, usePathname, useRouter, type Href } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';
import { useCartStore } from '../store/useCartStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteHeaderProps {
  slug: string;
  restaurantName: string;
}

type NavItem = {
  label: string;
  segment: '' | 'menu' | 'reservation' | 'about';
  pathname:
    | '/[restaurantSlug]'
    | '/[restaurantSlug]/menu'
    | '/[restaurantSlug]/reservation'
    | '/[restaurantSlug]/about';
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', segment: '', pathname: '/[restaurantSlug]' },
  { label: 'Menu', segment: 'menu', pathname: '/[restaurantSlug]/menu' },
  { label: 'Réservation', segment: 'reservation', pathname: '/[restaurantSlug]/reservation' },
  { label: 'À propos', segment: 'about', pathname: '/[restaurantSlug]/about' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SiteHeader({ slug, restaurantName }: SiteHeaderProps): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const totalItemCount = useCartStore((s) => s.totalItemCount);

  function hrefFor(item: NavItem): Href {
    return { pathname: item.pathname, params: { restaurantSlug: slug } };
  }

  function isActive(item: NavItem): boolean {
    const target = item.segment ? `/${slug}/${item.segment}` : `/${slug}`;
    return pathname === target;
  }

  const homeHref: Href = { pathname: '/[restaurantSlug]', params: { restaurantSlug: slug } };

  return (
    <View style={styles.header}>
      {/* Brand → home */}
      <Link href={homeHref} asChild>
        <TouchableOpacity accessibilityRole="link">
          <Text style={styles.brand} numberOfLines={1}>
            {restaurantName}
          </Text>
        </TouchableOpacity>
      </Link>

      {/* Nav links */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link key={item.segment} href={hrefFor(item)} asChild>
            <TouchableOpacity accessibilityRole="link">
              <Text style={[styles.navLink, isActive(item) && styles.navLinkActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      {/* Cart button */}
      <TouchableOpacity
        style={styles.cartButton}
        onPress={() =>
          router.push({ pathname: '/[restaurantSlug]/checkout', params: { restaurantSlug: slug } })
        }
        accessibilityRole="button"
        accessibilityLabel={`Panier, ${totalItemCount} articles`}
      >
        <ShoppingBag size={18} color={COLORS.textPrimary} strokeWidth={2} />
        {totalItemCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalItemCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLORS = {
  accent: '#FF6B35',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E8E8E8',
  white: '#FFFFFF',
} as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accent,
    maxWidth: 160,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flexShrink: 1,
  },
  navLink: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  navLinkActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
});
