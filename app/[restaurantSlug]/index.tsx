import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, MapPin, UtensilsCrossed, CalendarDays } from 'lucide-react-native';
import { useCartStore } from '../../store/useCartStore';
import type { ItemWithModifiers } from '../../types/airtable';

// ─── Screen: Home ─────────────────────────────────────────────────────────────

export default function HomeScreen(): JSX.Element | null {
  const { restaurantSlug } = useLocalSearchParams<{ restaurantSlug: string }>();
  const router = useRouter();
  const menuPayload = useCartStore((s) => s.menuPayload);

  if (!menuPayload) return null;
  const { restaurant, categories } = menuPayload;

  // A few in-stock items to tease on the home page.
  const featured: ItemWithModifiers[] = categories
    .flatMap((c) => c.items)
    .filter((i) => i.in_stock)
    .slice(0, 4);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        {restaurant.hero_image_url ? (
          <Image
            source={{ uri: restaurant.hero_image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroImage, styles.heroFallback]} />
        )}
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{restaurant.restaurant_name}</Text>
          {restaurant.tagline ? (
            <Text style={styles.heroTagline}>{restaurant.tagline}</Text>
          ) : null}
        </View>
      </View>

      {/* ── Primary CTAs ──────────────────────────────────────────────────── */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.cta, styles.ctaPrimary]}
          onPress={() => router.push({ pathname: '/[restaurantSlug]/menu', params: { restaurantSlug } })}
          accessibilityRole="button"
        >
          <UtensilsCrossed size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.ctaPrimaryText}>Commander</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cta, styles.ctaSecondary]}
          onPress={() => router.push({ pathname: '/[restaurantSlug]/reservation', params: { restaurantSlug } })}
          accessibilityRole="button"
        >
          <CalendarDays size={18} color={COLORS.accent} strokeWidth={2.2} />
          <Text style={styles.ctaSecondaryText}>Réserver</Text>
        </TouchableOpacity>
      </View>

      {/* ── Info strip ────────────────────────────────────────────────────── */}
      <View style={styles.infoCard}>
        {restaurant.opening_hours ? (
          <View style={styles.infoRow}>
            <Clock size={16} color={COLORS.textSecondary} strokeWidth={2} />
            <Text style={styles.infoText}>{restaurant.opening_hours}</Text>
          </View>
        ) : null}
        {restaurant.address ? (
          <View style={styles.infoRow}>
            <MapPin size={16} color={COLORS.textSecondary} strokeWidth={2} />
            <Text style={styles.infoText}>
              {restaurant.address}
              {restaurant.city ? `, ${restaurant.city}` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Featured ──────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nos incontournables</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/[restaurantSlug]/menu', params: { restaurantSlug } })}>
              <Text style={styles.sectionLink}>Voir le menu →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuredGrid}>
            {featured.map((item) => (
              <TouchableOpacity
                key={item.item_id}
                style={styles.featuredCard}
                onPress={() => router.push({ pathname: '/[restaurantSlug]/menu', params: { restaurantSlug } })}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
                <View style={styles.featuredBody}>
                  <Text style={styles.featuredName} numberOfLines={1}>
                    {item.name_fr}
                  </Text>
                  <Text style={styles.featuredPrice}>
                    {item.base_price.toFixed(2)} DH
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
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
  imageBg: '#EFEFEF',
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 24 },

  // Hero
  hero: {
    height: 240,
    justifyContent: 'flex-end',
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroFallback: { backgroundColor: '#2A2A2A' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroContent: { padding: 20 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  heroTagline: { fontSize: 15, color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  // CTAs
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaPrimary: { backgroundColor: COLORS.accent },
  ctaPrimaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  ctaSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  ctaSecondaryText: { fontSize: 15, fontWeight: '700', color: COLORS.accent },

  // Info
  infoCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: COLORS.textPrimary, flex: 1 },

  // Featured
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  sectionLink: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featuredCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featuredImage: { width: '100%', height: 110, backgroundColor: COLORS.imageBg },
  featuredBody: { padding: 10, gap: 2 },
  featuredName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  featuredPrice: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
});
