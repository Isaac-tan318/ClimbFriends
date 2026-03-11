import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { CURRENT_USER_SETTINGS } from '@/data/mock-users';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import type { UserSettings } from '@/types';

import { err, ok, type AppResult } from '@/services/api/result';

type DbSettingsRow = {
  user_id: string;
  location_enabled: boolean;
  friend_visibility_enabled: boolean;
  notifications_enabled: boolean;
};

const mapSettings = (row: DbSettingsRow): UserSettings => ({
  userId: row.user_id,
  locationEnabled: row.location_enabled,
  friendVisibilityEnabled: row.friend_visibility_enabled,
  notificationsEnabled: row.notifications_enabled,
});

export const settingsService = {
  async getSettings(userId: string): Promise<AppResult<UserSettings>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth) {
      return ok(CURRENT_USER_SETTINGS);
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('user_settings')
      .select('user_id,location_enabled,friend_visibility_enabled,notifications_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return err(error.message, error.code, error);
    }

    if (!data) {
      const createResult = await this.updateSettings(userId, {
        userId,
        locationEnabled: true,
        friendVisibilityEnabled: true,
        notificationsEnabled: true,
      });
      if (!createResult.ok) return createResult;
      return ok(createResult.data);
    }

    return ok(mapSettings(data as DbSettingsRow));
  },

  async updateSettings(
    userId: string,
    partial: Partial<UserSettings>,
  ): Promise<AppResult<UserSettings>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth) {
      return ok({ ...CURRENT_USER_SETTINGS, ...partial, userId });
    }

    const client = getSupabaseClient();
    const payload = {
      user_id: userId,
      location_enabled: partial.locationEnabled,
      friend_visibility_enabled: partial.friendVisibilityEnabled,
      notifications_enabled: partial.notificationsEnabled,
    };

    const { data, error } = await client
      .from('user_settings')
      .upsert(payload)
      .select('user_id,location_enabled,friend_visibility_enabled,notifications_enabled')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to update settings', error?.code, error);
    }

    return ok(mapSettings(data as DbSettingsRow));
  },
};
