import { useEffect } from 'react';

import {
  useAuthStore,
  useNotificationStore,
  useSessionStore,
  useSettingsStore,
  useSocialStore,
} from '@/stores';

export function useBootstrapStoreSync() {
  useEffect(() => {
    void useAuthStore.getState().initialize();
    void useSessionStore.getState().initialize();
    void useSettingsStore.getState().initialize();
    void useSocialStore.getState().initialize();
    void useNotificationStore.getState().initialize();
  }, []);
}
