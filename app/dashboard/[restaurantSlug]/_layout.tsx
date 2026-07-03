import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Link,
  Redirect,
  Slot,
  useLocalSearchParams,
  usePathname,
  type Href,
} from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useAuthStore } from '../../../store/useAuthStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  segment: '' | 'reservations' | 'menu';
  pathname:
    | '/dashboard/[restaurantSlug]'
    | '/dashboard/[restaurantSlug]/reservations'
    | '/dashboard/[restaurantSlug]/menu';
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Commandes', segment: '', pathname: '/dashboard/[restaurantSlug]' },
  { label: 'Réservations', segment: 'reservations', pathname: '/dashboard/[restaurantSlug]/reservations' },
  { label: 'Menu', segment: 'menu', pathname: '/dashboard/[restaurantSlug]/menu' },
];

// ─── Layout (auth guard) ──────────────────────────────────────────────────────

export default function DashboardLayout(): JSX.Element | null {
  const { restaurantSlug } = useLocalSearchParams<{ restaurantSlug: string }>();
  const pathname = usePathname();

  const token          = useAuthStore((s) => s.token);
  const authSlug       = useAuthStore((s) => s.slug);
  const restaurantName = useAuthStore((s) => s.restaurantName);
  const logout         = useAuthStore((s) => s.logout);

  // Params may not be resolved on first render — wait before guarding.
  if (!restaurantSlug) return null;
  // Guard: must be logged in AND scoped to this slug.
  if (!token || authSlug !== restaurantSlug) {
    return <Redirect href="/dashboard/login" />;
  }

  function hrefFor(item: NavItem): Href {
    return { pathname: item.pathname, params: { restaurantSlug } };
  }

  function isActive(item: NavItem): boolean {
    const target = item.segment
      ? `/dashboard/${restaurantSlug}/${item.segment}`
      : `/dashboard/${restaurantSlug}`;
    return pathname === target;
  }

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand} numberOfLines={1}>
            {restaurantName ?? restaurantSlug}
          </Text>
          <Text style={styles.brandSub}>Tableau de bord</Text>
        </View>
        <TouchableOpacity
          style={styles.logout}
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <LogOut size={16} color={COLORS.textSecondary} strokeWidth={2} />
          <Text style={styles.logoutText}>Quitter</Text>
        </TouchableOpacity>
      </View>

      {/* Nav */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link key={item.segment} href={hrefFor(item)} asChild>
            <TouchableOpacity
              style={[styles.tab, isActive(item) && styles.tabActive]}
              accessibilityRole="link"
            >
              <Text style={[styles.tabText, isActive(item) && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      <Slot />
    </View>
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
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandBlock: { flex: 1 },
  brand: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  brandSub: { fontSize: 12, color: COLORS.textSecondary },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  logoutText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  nav: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
});
