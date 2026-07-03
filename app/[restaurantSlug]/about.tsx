import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Clock, Instagram, Facebook, MapPin, Phone } from 'lucide-react-native';
import { useCartStore } from '../../store/useCartStore';

// ─── Screen: À propos ─────────────────────────────────────────────────────────

export default function AboutScreen(): JSX.Element | null {
  const menuPayload = useCartStore((s) => s.menuPayload);
  if (!menuPayload) return null;
  const { restaurant } = menuPayload;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>À propos</Text>
      <Text style={styles.subtitle}>{restaurant.restaurant_name}</Text>

      {restaurant.about_text ? (
        <Text style={styles.body}>{restaurant.about_text}</Text>
      ) : (
        <Text style={styles.bodyMuted}>
          {restaurant.restaurant_name} vous accueille avec une cuisine préparée
          avec soin. Commandez en ligne ou réservez votre table.
        </Text>
      )}

      {/* ── Contact / infos ─────────────────────────────────────────────────── */}
      <View style={styles.card}>
        {restaurant.opening_hours ? (
          <View style={styles.row}>
            <Clock size={18} color={COLORS.accent} strokeWidth={2} />
            <Text style={styles.rowText}>{restaurant.opening_hours}</Text>
          </View>
        ) : null}

        {restaurant.address ? (
          <View style={styles.row}>
            <MapPin size={18} color={COLORS.accent} strokeWidth={2} />
            <Text style={styles.rowText}>
              {restaurant.address}
              {restaurant.city ? `, ${restaurant.city}` : ''}
            </Text>
          </View>
        ) : null}

        {restaurant.phone ? (
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
            accessibilityRole="button"
          >
            <Phone size={18} color={COLORS.accent} strokeWidth={2} />
            <Text style={[styles.rowText, styles.link]}>{restaurant.phone}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Socials ─────────────────────────────────────────────────────────── */}
      {(restaurant.instagram_url || restaurant.facebook_url) && (
        <View style={styles.socials}>
          {restaurant.instagram_url ? (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL(restaurant.instagram_url!)}
              accessibilityRole="link"
              accessibilityLabel="Instagram"
            >
              <Instagram size={20} color={COLORS.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
          {restaurant.facebook_url ? (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL(restaurant.facebook_url!)}
              accessibilityRole="link"
              accessibilityLabel="Facebook"
            >
              <Facebook size={20} color={COLORS.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
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
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 15, fontWeight: '600', color: COLORS.accent, marginTop: -6 },
  body: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 24 },
  bodyMuted: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 24 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 14, color: COLORS.textPrimary, flex: 1 },
  link: { color: COLORS.accent, fontWeight: '600' },
  socials: { flexDirection: 'row', gap: 12, marginTop: 8 },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
