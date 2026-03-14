import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useAuthRouting } from '@/hooks/use-auth-routing';
import { useAuthSessionSync } from '@/hooks/use-auth-session-sync';
import { useBootstrapStoreSync } from '@/hooks/use-bootstrap-store-sync';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePresenceSync } from '@/hooks/use-presence-sync';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useBootstrapStoreSync();
  useAuthSessionSync();
  useAuthRouting();
  usePresenceSync();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
