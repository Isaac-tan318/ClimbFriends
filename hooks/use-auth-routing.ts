import { useEffect } from 'react';

import { usePathname, useRouter } from 'expo-router';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { hasSupabaseConfig } from '@/lib/supabase';
import { useAuthStore } from '@/stores';

const requiresAuth = hasSupabaseConfig && FEATURE_FLAGS.useSupabaseAuth;

export function useAuthRouting() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    if (!initialized || !requiresAuth) return;

    const inAuthStack = pathname.startsWith('/(auth)');

    if (user && inAuthStack) {
      router.replace('/(tabs)');
      return;
    }

    if (!user && !inAuthStack) {
      router.replace('/(auth)/login');
    }
  }, [initialized, pathname, router, user]);
}
