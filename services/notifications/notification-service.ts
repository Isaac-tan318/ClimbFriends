import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import type { Notification } from '@/types';

import { fromIso, fromIsoOrNow } from '@/services/api/date';
import { err, ok, type AppResult } from '@/services/api/result';

type DbNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

const mapNotification = (row: DbNotification): Notification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  body: row.body ?? undefined,
  data: row.data ?? undefined,
  readAt: fromIso(row.read_at),
  createdAt: fromIsoOrNow(row.created_at),
});

const isSupabaseNotificationsEnabled = hasSupabaseConfig && FEATURE_FLAGS.useSupabaseNotifications;

export const notificationService = {
  async getNotifications(userId: string, unreadOnly = false): Promise<AppResult<Notification[]>> {
    if (!isSupabaseNotificationsEnabled) {
      return ok([]);
    }

    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    let query = client
      .from('notifications')
      .select('id,user_id,type,title,body,data,read_at,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query;

    if (error || !data) {
      return err(error?.message ?? 'Unable to fetch notifications', error?.code, error);
    }

    return ok((data as DbNotification[]).map(mapNotification));
  },

  async markRead(notificationId: string): Promise<AppResult<void>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseNotifications) {
      return ok(undefined);
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      return err(error.message, error.code, error);
    }

    return ok(undefined);
  },

  async markAllRead(userId: string): Promise<AppResult<void>> {
    if (!isSupabaseNotificationsEnabled) {
      return ok(undefined);
    }

    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      return err(error.message, error.code, error);
    }

    return ok(undefined);
  },
};
