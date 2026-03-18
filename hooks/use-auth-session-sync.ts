import { useEffect } from 'react';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import {
  useAuthStore,
  useNotificationStore,
  useSessionStore,
  useSettingsStore,
  useSocialStore,
} from '@/stores';

export function useAuthSessionSync() {
  useEffect(() => {
    const syncAppState = async () => {
      const authResult = await useAuthStore.getState().initialize();
      if (!authResult.ok || !authResult.data) {
        useSessionStore.getState().resetForSignedOut();
        useSettingsStore.getState().resetForSignedOut();
        useSocialStore.getState().resetForSignedOut();
        useNotificationStore.getState().resetForSignedOut();
        return;
      }

      await Promise.all([
        useSessionStore.getState().initialize(),
        useSettingsStore.getState().initialize(),
        useSocialStore.getState().initialize(),
        useNotificationStore.getState().initialize(),
      ]);
    };

    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth || !supabase) {
      void syncAppState();
      return;
    }

    void syncAppState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      console.log(`Auth Listener Fired: ${event}`);

      if (event === 'INITIAL_SESSION') {
        return;
      }

      await syncAppState();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
