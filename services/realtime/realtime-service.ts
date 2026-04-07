import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { supabase } from '@/lib/supabase';
import type { Message, Notification } from '@/types';

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

type SessionPresence = {
  userId: string;
  gymId: string | null;
  isActive: boolean;
  startedAt: Date | null;
  endedAt: Date | null;
};

const mapSessionPresence = (payload: Record<string, unknown>): SessionPresence => ({
  userId: String(payload.user_id),
  gymId: (payload.gym_id as string | null) ?? null,
  isActive: Boolean(payload.is_active),
  startedAt: fromIsoOrNow((payload.started_at as string | null) ?? null),
  endedAt: fromIso((payload.ended_at as string | null) ?? null),
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

  subscribeToActiveSessions(userIds: string[], onChange: (presence: SessionPresence) => void): () => void {
    if (!supabase || !FEATURE_FLAGS.useSupabaseSessions) return () => undefined;
    const ids = userIds.filter(Boolean);
    if (ids.length === 0) return () => undefined;
    const client = supabase;

    const filterValues = ids.map((id) => `"${id}"`).join(',');
    const filter = `user_id=in.(${filterValues})`;
    const channel = client
      .channel(`sessions:${ids.length}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'climbing_sessions',
          filter,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown>;
          if (row) onChange(mapSessionPresence(row));
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  },
};
