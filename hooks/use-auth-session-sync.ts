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
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth || !supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      const authResult = await useAuthStore.getState().initialize();
      if (!authResult.ok) return;

      if (!authResult.data) {
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
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
