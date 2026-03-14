import { create } from 'zustand';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { hasSupabaseConfig } from '@/lib/supabase';
import type { Notification } from '@/types';
import { getCurrentUserId } from '@/services/auth/current-user';
import { notificationService } from '@/services/notifications/notification-service';
import { err, ok, type AppResult } from '@/services/api/result';

type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  initialize: () => Promise<AppResult<Notification[]>>;
  refresh: () => Promise<AppResult<Notification[]>>;
  markRead: (notificationId: string) => Promise<AppResult<void>>;
  markAllRead: () => Promise<AppResult<void>>;
  resetForSignedOut: () => void;
};

const DEFAULT_USER_ID = 'user-1';
const useMockNotifications = !hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseNotifications;

const resolveUserId = async (): Promise<string | null> => {
  const userId = await getCurrentUserId();
  if (userId) return userId;
  return useMockNotifications ? DEFAULT_USER_ID : null;
};

const loadNotifications = async (userId: string) => notificationService.getNotifications(userId);

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  initialized: false,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    const userId = await resolveUserId();
    if (!userId) {
      set({ notifications: [], unreadCount: 0, loading: false, initialized: true, error: null });
      return ok([]);
    }

    const result = await loadNotifications(userId);

    if (!result.ok) {
      set({ loading: false, initialized: true, error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    const unreadCount = result.data.filter((notification) => !notification.readAt).length;
    set({ notifications: result.data, unreadCount, loading: false, initialized: true, error: null });
    return ok(result.data);
  },

  refresh: async () => {
    const userId = await resolveUserId();
    if (!userId) {
      set({ notifications: [], unreadCount: 0, initialized: true, error: null });
      return ok([]);
    }

    const result = await loadNotifications(userId);

    if (!result.ok) {
      set({ error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    const unreadCount = result.data.filter((notification) => !notification.readAt).length;
    set({ notifications: result.data, unreadCount, error: null, initialized: true });
    return ok(result.data);
  },

  markRead: async (notificationId) => {
    const result = await notificationService.markRead(notificationId);
    if (!result.ok) {
      set({ error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => {
      const notifications = state.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt: notification.readAt ?? new Date() }
          : notification,
      );

      return {
        notifications,
        unreadCount: notifications.filter((notification) => !notification.readAt).length,
        error: null,
      };
    });

    return ok(undefined);
  },

  markAllRead: async () => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const result = await notificationService.markAllRead(userId);

    if (!result.ok) {
      set({ error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date(),
      })),
      unreadCount: 0,
      error: null,
    }));

    return ok(undefined);
  },

  resetForSignedOut: () => {
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      initialized: true,
      error: null,
    });
  },
}));
