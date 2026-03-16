import { useEffect } from 'react';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { hasSupabaseConfig } from '@/lib/supabase';
import {
  useAuthStore,
  useNotificationStore,
  useSessionStore,
  useSettingsStore,
  useSocialStore,
} from '@/stores';

export function useBootstrapStoreSync() {
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const authResult = await useAuthStore.getState().initialize();
      if (cancelled || !authResult.ok) return;

      const user = authResult.data;
      const requiresAuthUser = hasSupabaseConfig && FEATURE_FLAGS.useSupabaseAuth;

      if (requiresAuthUser && !user) {
        useSessionStore.getState().resetForSignedOut();
        useSettingsStore.getState().resetForSignedOut();
        useSocialStore.getState().resetForSignedOut();
        useNotificationStore.getState().resetForSignedOut();
        return;
      }

      await Promise.allSettled([
        useSessionStore.getState().initialize(),
        useSettingsStore.getState().initialize(),
        useSocialStore.getState().initialize(),
        useNotificationStore.getState().initialize(), 
      ]);
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);
}
