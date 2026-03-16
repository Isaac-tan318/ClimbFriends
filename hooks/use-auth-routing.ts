import { useEffect } from 'react';

import { usePathname, useRouter } from 'expo-router';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { hasSupabaseConfig } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { useSegments } from 'expo-router';
import { useRootNavigationState } from 'expo-router';

const requiresAuth = hasSupabaseConfig && FEATURE_FLAGS.useSupabaseAuth;

export function useAuthRouting() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const segments = useSegments(); // 2. Call useSegments instead of usePathname
  const initialized = useAuthStore((state) => state.initialized);

  const rootNavigationState = useRootNavigationState();


  useEffect(() => {
    console.log("🚦 AuthRouting Check:");
    console.log("- Initialized:", initialized);
    console.log("- User exists:", !!user);
    console.log("- Segments:", segments);
    console.log("- Nav Key:", !!rootNavigationState?.key);

    if (!initialized || !requiresAuth || !rootNavigationState?.key) return;

    // Check if the current route starts with '(auth)'
    const inAuthStack = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)'
    console.log("- In Auth Stack?", inAuthStack);

    if (user && !inTabsGroup) {
      console.log("➡️ Firing redirect to /(tabs)!");
      // The slight timeout prevents the router from dropping the command 
      // if it is still finishing its initial mount animation
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
      return;
    }

    if (!user && !inAuthStack) {
      console.log("⬅️ Firing redirect to login!");
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 100);
    }
  }, [initialized, segments, router, user, rootNavigationState?.key]);
}
