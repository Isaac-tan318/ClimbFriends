import { Redirect } from 'expo-router';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { hasSupabaseConfig } from '@/lib/supabase';
import { useAuthStore } from '@/stores';

const requiresAuth = hasSupabaseConfig && FEATURE_FLAGS.useSupabaseAuth;

export default function IndexScreen() {
  const user = useAuthStore((state) => state.user);

  if (requiresAuth && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
