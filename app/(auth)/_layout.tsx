import { Redirect, Stack } from 'expo-router';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { hasSupabaseConfig } from '@/lib/supabase';
import { useAuthStore } from '@/stores';

const requiresAuth = hasSupabaseConfig && FEATURE_FLAGS.useSupabaseAuth;

export default function AuthLayout() {
  const user = useAuthStore((state) => state.user);

  if (requiresAuth && user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
