import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  color: string;
}

const CONFETTI_COLORS = ['#facc15', '#22c55e', '#3b82f6', '#f472b6', '#f97316'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardLogin(): JSX.Element {
  const router = useRouter();
  const login       = useAuthStore((s) => s.login);
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);
  const loginError  = useAuthStore((s) => s.loginError);

  const [slug, setSlug]         = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess]   = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Card entrance animation
  const cardScale   = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function handleLogin(): Promise<void> {
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug || !password || isLoggingIn) return;

    const ok = await login(cleanSlug, password);
    if (!ok) return;

    // Build confetti particles
    const burst: Particle[] = Array.from({ length: 30 }).map((_, i) => ({
      id: Date.now() + i,
      x:      new Animated.Value(0),
      y:      new Animated.Value(0),
      scale:  new Animated.Value(1),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(Math.random() * 360),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));

    setSuccess(true);
    setParticles(burst);

    // Animate every particle outward then fade
    Animated.parallel(
      burst.map((p) =>
        Animated.parallel([
          Animated.timing(p.x, {
            toValue: (Math.random() - 0.5) * 300,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: -(Math.random() * 260 + 60),
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.scale, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(p.rotate, {
            toValue: Math.random() * 720,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      )
    ).start(() => {
      setParticles([]);
      router.replace({
        pathname: '/dashboard/[restaurantSlug]',
        params: { restaurantSlug: cleanSlug },
      });
    });
  }

  const canSubmit = slug.trim().length > 0 && password.length > 0 && !isLoggingIn;

  return (
    <View style={styles.screen}>

      {/* Confetti burst */}
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          style={[
            styles.particle,
            { backgroundColor: p.color },
            {
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [0, 720],
                    outputRange: ['0deg', '720deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      {/* Card */}
      <Animated.View
        style={[
          styles.card,
          { opacity: cardOpacity, transform: [{ scale: cardScale }] },
        ]}
      >
        <Text style={styles.title}>
          {success ? '🎉 Bienvenue !' : 'Tableau de bord'}
        </Text>
        <Text style={styles.subtitle}>
          {success ? 'Redirection en cours…' : 'Connexion restaurateur'}
        </Text>

        {!success && (
          <>
            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={styles.label}>Identifiant du restaurant</Text>
                <TextInput
                  style={styles.input}
                  placeholder="le-coin-gourmand"
                  placeholderTextColor="#B0B0B0"
                  value={slug}
                  onChangeText={setSlug}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Mot de passe</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#B0B0B0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  onSubmitEditing={handleLogin}
                />
              </View>
            </View>

            {loginError ? (
              <Text style={styles.error}>{loginError}</Text>
            ) : null}
          </>
        )}

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {success
              ? 'Connecté !'
              : isLoggingIn
              ? 'Connexion…'
              : 'Se connecter'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F1F1F3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 8,
    // Web shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    marginBottom: 8,
  },

  fields: { gap: 14, marginTop: 4 },

  field: { gap: 6 },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B6B',
  },

  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
  },

  error: {
    color: '#C0392B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },

  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },

  buttonDisabled: { opacity: 0.45 },

  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
