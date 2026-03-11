import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { supabase } from '@/lib/supabase';
import type { Message, Notification, UserPresence } from '@/types';

import { fromIso, fromIsoOrNow } from '@/services/api/date';

const mapMessage = (payload: Record<string, unknown>): Message => ({
  id: String(payload.id),
  senderId: String(payload.sender_id),
  receiverId: String(payload.receiver_id),
  content: String(payload.content ?? ''),
  readAt: fromIso((payload.read_at as string | null) ?? null),
  createdAt: fromIsoOrNow((payload.created_at as string | null) ?? null),
});

const mapNotification = (payload: Record<string, unknown>): Notification => ({
  id: String(payload.id),
  userId: String(payload.user_id),
  type: String(payload.type ?? 'unknown'),
  title: String(payload.title ?? ''),
  body: (payload.body as string | null) ?? undefined,
  data: (payload.data as Record<string, unknown> | null) ?? undefined,
  readAt: fromIso((payload.read_at as string | null) ?? null),
  createdAt: fromIsoOrNow((payload.created_at as string | null) ?? null),
});

const mapPresence = (payload: Record<string, unknown>): UserPresence => ({
  userId: String(payload.user_id),
  currentGymId: (payload.current_gym_id as string | null) ?? null,
  isAtGym: Boolean(payload.is_at_gym),
  lastSeenAt: fromIso((payload.last_seen_at as string | null) ?? null),
  latitude: (payload.latitude as number | null) ?? undefined,
  longitude: (payload.longitude as number | null) ?? undefined,
  updatedAt: fromIsoOrNow((payload.updated_at as string | null) ?? null),
});

export const realtimeService = {
  subscribeToMessages(userId: string, onMessage: (message: Message) => void): () => void {
    if (!supabase || !FEATURE_FLAGS.useSupabaseMessages) return () => undefined;
    const client = supabase;

    const channel = client
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) onMessage(mapMessage(payload.new as Record<string, unknown>));
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  },

  subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void,
  ): () => void {
    if (!supabase || !FEATURE_FLAGS.useSupabaseNotifications) return () => undefined;
    const client = supabase;

    const channel = client
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) onNotification(mapNotification(payload.new as Record<string, unknown>));
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  },

  subscribeToPresence(onPresence: (presence: UserPresence) => void): () => void {
    if (!supabase || !FEATURE_FLAGS.useSupabasePresence) return () => undefined;
    const client = supabase;

    const channel = client
      .channel('presence:user_locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown>;
          if (row) onPresence(mapPresence(row));
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  },
};
