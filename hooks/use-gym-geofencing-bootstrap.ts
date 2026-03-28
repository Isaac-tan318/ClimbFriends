import { useEffect } from 'react';

import { AppState } from 'react-native';

import { syncGymGeofencingAsync } from '@/services/geofencing/gym-geofencing';
import { useAuthStore, useSessionStore, useSettingsStore } from '@/stores';

export function useGymGeofencingBootstrap() {
  const authInitialized = useAuthStore((state) => state.initialized);
  const authUserId = useAuthStore((state) => state.user?.id ?? null);
  const settingsInitialized = useSettingsStore((state) => state.sync.initialized);
  const locationEnabled = useSettingsStore((state) => state.settings.locationEnabled);
  const refreshSessions = useSessionStore((state) => state.refreshSessions);

  useEffect(() => {
    const syncGeofencing = () => {
      if (!authInitialized) {
        return;
      }

      if (authUserId && !settingsInitialized) {
        return;
      }

      const enabled = Boolean(authUserId) && locationEnabled;

      // The root layout bootstraps the already-defined task on every cold start. We deliberately
      // avoid permission prompts here so app launch stays quiet; call registerGymGeofencingAsync()
      // from an explicit user action to ask for permissions the first time.
      void syncGymGeofencingAsync({
        enabled,
        promptForPermissions: false,
      }).then((result) => {
        if (!result.ok) {
          console.warn('Unable to sync gym geofencing:', result.error.message);
        }
      });
    };

    // iOS can relaunch the JS bundle for a geofence event after termination. Android generally will
    // not deliver new geofence callbacks once the user force-stops the app, so re-syncing here
    // makes the regions active again as soon as the user returns to the app.
    syncGeofencing();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }

      syncGeofencing();

      if (authUserId) {
        // Background enter/exit handlers may have mutated session state while the UI was asleep.
        // Refreshing on foreground keeps the active-session card aligned with the persisted backend state.
        void refreshSessions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [authUserId, authInitialized, locationEnabled, refreshSessions, settingsInitialized]);
}
