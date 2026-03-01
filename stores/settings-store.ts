import { create } from 'zustand';
import { UserSettings } from '@/types';
import { CURRENT_USER_SETTINGS } from '@/data';

interface SettingsState {
  settings: UserSettings;
  setLocationEnabled: (enabled: boolean) => void;
  setFriendVisibilityEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  userId: 'user-1',
  locationEnabled: true,
  friendVisibilityEnabled: true,
  notificationsEnabled: true,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: CURRENT_USER_SETTINGS ?? DEFAULT_SETTINGS,
  
  setLocationEnabled: (enabled) =>
    set((state) => ({
      settings: { ...(state.settings ?? DEFAULT_SETTINGS), locationEnabled: enabled },
    })),
  
  setFriendVisibilityEnabled: (enabled) =>
    set((state) => ({
      settings: { ...(state.settings ?? DEFAULT_SETTINGS), friendVisibilityEnabled: enabled },
    })),
  
  setNotificationsEnabled: (enabled) =>
    set((state) => ({
      settings: { ...(state.settings ?? DEFAULT_SETTINGS), notificationsEnabled: enabled },
    })),
  
  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...(state.settings ?? DEFAULT_SETTINGS), ...partial },
    })),
}));
