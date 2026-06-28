import { View, Text, StyleSheet } from 'react-native';

export default function RootScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restaurant Menu</Text>
      <Text style={styles.body}>
        Scan a QR code or navigate to:
      </Text>
      <Text style={styles.example}>
        /your-restaurant-slug
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    gap: 12,
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  body: {
    fontSize: 15,
    color: '#6B6B6B',
  },
  example: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },
});
