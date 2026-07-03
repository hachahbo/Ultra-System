import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// react-native-web 0.19 tries element.style[0]=cssText which Chrome 108+ blocks.
// Silently swallow the indexed setter so styles still apply via className.
if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(CSSStyleDeclaration.prototype, 0, {
      set(_v: string) {},
      configurable: true,
    });
  } catch (_) {}
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
