import { useEffect } from 'react';

import * as Location from 'expo-location';
import { AppState } from 'react-native';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { hasSupabaseConfig } from '@/lib/supabase';
import { presenceService } from '@/services/presence/presence-service';
import { useAuthStore, useSessionStore, useSettingsStore } from '@/stores';

const PRESENCE_SYNC_INTERVAL_MS = 120000;
const shouldSyncPresence = hasSupabaseConfig && FEATURE_FLAGS.useSupabasePresence;

export function usePresenceSync() {
  const authUser = useAuthStore((state) => state.user);
  const activeSession = useSessionStore((state) => state.activeSession);
  const locationEnabled = useSettingsStore((state) => state.settings.locationEnabled);

  useEffect(() => {
    if (!shouldSyncPresence || !authUser?.id || !locationEnabled) return;

    let mounted = true;
    let appState = AppState.currentState;
    let permissionKnown = false;
    let hasPermission = false;

    const syncPresence = async () => {
      if (!mounted) return;

      if (activeSession?.gymId) {
        await presenceService.updatePresence({
          userId: authUser.id,
          currentGymId: activeSession.gymId,
          isAtGym: true,
        });
        return;
      }

      if (!permissionKnown) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        hasPermission = status === 'granted';
        permissionKnown = true;
      }

      if (!hasPermission) return;

      const location = await Location.getCurrentPositionAsync({});
      await presenceService.updateFromCoordinates({
        userId: authUser.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    };

    void syncPresence();

    const interval = setInterval(() => {
      if (appState === 'active') {
        void syncPresence();
      }
    }, PRESENCE_SYNC_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      appState = nextState;
      if (nextState === 'active') {
        void syncPresence();
      }
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [authUser?.id, activeSession?.gymId, locationEnabled]);
}
