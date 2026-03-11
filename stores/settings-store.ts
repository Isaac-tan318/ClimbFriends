import { create } from 'zustand';

import { CURRENT_USER_SETTINGS } from '@/data/mock-users';
import type { UserSettings } from '@/types';
import { getCurrentUserId } from '@/services/auth/current-user';
import { settingsService } from '@/services/settings/settings-service';
import { err, ok, type AppResult } from '@/services/api/result';

type SyncState = {
  loading: boolean;
  initialized: boolean;
  source: 'mock' | 'supabase';
  error: string | null;
};

interface SettingsState {
  settings: UserSettings;
  sync: SyncState;
  initialize: () => Promise<AppResult<UserSettings>>;
  setLocationEnabled: (enabled: boolean) => Promise<AppResult<UserSettings>>;
  setFriendVisibilityEnabled: (enabled: boolean) => Promise<AppResult<UserSettings>>;
  setNotificationsEnabled: (enabled: boolean) => Promise<AppResult<UserSettings>>;
  updateSettings: (partial: Partial<UserSettings>) => Promise<AppResult<UserSettings>>;
}

const DEFAULT_SETTINGS: UserSettings = {
  userId: 'user-1',
  locationEnabled: true,
  friendVisibilityEnabled: true,
  notificationsEnabled: true,
};

const initialSettings = CURRENT_USER_SETTINGS ?? DEFAULT_SETTINGS;

const resolveUserId = async () => (await getCurrentUserId()) ?? initialSettings.userId;

const withSyncStart = (set: (partial: Partial<SettingsState>) => void) => {
  set({ sync: { loading: true, initialized: true, source: 'mock', error: null } });
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: initialSettings,
  sync: {
    loading: false,
    initialized: false,
    source: 'mock',
    error: null,
  },

  initialize: async () => {
    withSyncStart(set);
    const userId = await resolveUserId();
    const result = await settingsService.getSettings(userId);

    if (!result.ok) {
      set((state) => ({
        sync: {
          ...state.sync,
          loading: false,
          error: result.error.message,
        },
      }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    set({
      settings: result.data,
      sync: {
        loading: false,
        initialized: true,
        source: result.data.userId === initialSettings.userId ? 'mock' : 'supabase',
        error: null,
      },
    });

    return ok(result.data);
  },

  updateSettings: async (partial) => {
    withSyncStart(set);

    const previous = get().settings;
    const optimistic = {
      ...previous,
      ...partial,
      userId: previous.userId,
    };

    set({ settings: optimistic });

    const userId = await resolveUserId();
    const result = await settingsService.updateSettings(userId, partial);

    if (!result.ok) {
      set((state) => ({
        settings: previous,
        sync: {
          ...state.sync,
          loading: false,
          error: result.error.message,
        },
      }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    set({
      settings: result.data,
      sync: {
        loading: false,
        initialized: true,
        source: result.data.userId === initialSettings.userId ? 'mock' : 'supabase',
        error: null,
      },
    });

    return ok(result.data);
  },

  setLocationEnabled: async (enabled) => get().updateSettings({ locationEnabled: enabled }),

  setFriendVisibilityEnabled: async (enabled) =>
    get().updateSettings({ friendVisibilityEnabled: enabled }),

  setNotificationsEnabled: async (enabled) =>
    get().updateSettings({ notificationsEnabled: enabled }),
}));
