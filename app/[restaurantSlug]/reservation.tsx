import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CalendarCheck, Check } from 'lucide-react-native';
import { submitReservation } from '../../lib/api';

// ─── Screen: Réservation ──────────────────────────────────────────────────────

export default function ReservationScreen(): JSX.Element {
  const { restaurantSlug } = useLocalSearchParams<{ restaurantSlug: string }>();

  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [partySize, setPartySize] = useState('2');
  const [date, setDate]         = useState('');
  const [time, setTime]         = useState('');
  const [notes, setNotes]       = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [done, setDone]             = useState(false);

  const canSubmit =
    name.trim() && phone.trim() && Number(partySize) > 0 && date.trim() && time.trim();

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReservation({
        restaurant_slug: restaurantSlug,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        party_size: Number(partySize),
        date: date.trim(),
        time: time.trim(),
        notes: notes.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la réservation.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.successWrap}>
        <View style={styles.successIcon}>
          <Check size={32} color="#FFFFFF" strokeWidth={3} />
        </View>
        <Text style={styles.successTitle}>Réservation envoyée !</Text>
        <Text style={styles.successBody}>
          Le restaurant vous contactera au {phone} pour confirmer votre table
          pour {partySize} personne(s) le {date} à {time}.
        </Text>
      </View>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <CalendarCheck size={22} color={COLORS.accent} strokeWidth={2.2} />
        <Text style={styles.title}>Réserver une table</Text>
      </View>

      <Field label="Nom complet *">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Votre nom"
          placeholderTextColor={COLORS.placeholder}
        />
      </Field>

      <Field label="Téléphone *">
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="06 XX XX XX XX"
          placeholderTextColor={COLORS.placeholder}
          keyboardType="phone-pad"
        />
      </Field>

      <View style={styles.row}>
        <Field label="Personnes *" style={styles.rowItem}>
          <TextInput
            style={styles.input}
            value={partySize}
            onChangeText={setPartySize}
            placeholder="2"
            placeholderTextColor={COLORS.placeholder}
            keyboardType="number-pad"
          />
        </Field>
        <Field label="Date *" style={styles.rowItem}>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="JJ/MM/AAAA"
            placeholderTextColor={COLORS.placeholder}
          />
        </Field>
        <Field label="Heure *" style={styles.rowItem}>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="20:30"
            placeholderTextColor={COLORS.placeholder}
          />
        </Field>
      </View>

      <Field label="Remarques">
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Allergies, occasion spéciale…"
          placeholderTextColor={COLORS.placeholder}
          multiline
        />
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || submitting}
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>Envoyer la réservation</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Small field wrapper ──────────────────────────────────────────────────────

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}): JSX.Element {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
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
  border: '#E0E0E0',
  placeholder: '#B0B0B0',
  error: '#C0392B',
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  rowItem: { flex: 1 },
  error: { color: COLORS.error, fontSize: 14 },
  submit: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Success
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 14,
    backgroundColor: COLORS.background,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  successBody: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
