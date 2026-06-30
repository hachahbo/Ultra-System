import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page introuvable' }} />
      <View style={styles.container}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Page introuvable</Text>
        <Text style={styles.body}>
          Scannez le QR code de votre table pour accéder au menu.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Retour à l'accueil</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 32,
    gap: 12,
  },
  code: {
    fontSize: 64,
    fontWeight: '700',
    color: '#E8E8E8',
    lineHeight: 72,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  body: {
    fontSize: 15,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 22,
  },
  link: {
    marginTop: 8,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },
});
