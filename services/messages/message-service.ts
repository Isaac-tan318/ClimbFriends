import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import type { Message } from '@/types';

import { fromIso, fromIsoOrNow, toIso } from '@/services/api/date';
import { err, ok, type AppResult } from '@/services/api/result';

type DbMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

const mapMessage = (row: DbMessage): Message => ({
  id: row.id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  content: row.content,
  readAt: fromIso(row.read_at),
  createdAt: fromIsoOrNow(row.created_at),
});

const isSupabaseMessagesEnabled = hasSupabaseConfig && FEATURE_FLAGS.useSupabaseMessages;

export const messageService = {
  async getConversation(input: {
    userId: string;
    otherUserId: string;
    limit?: number;
    before?: Date;
  }): Promise<AppResult<Message[]>> {
    if (!isSupabaseMessagesEnabled) {
      return ok([]);
    }

    if (!input.userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    let query = client
      .from('messages')
      .select('id,sender_id,receiver_id,content,read_at,created_at')
      .or(
        `and(sender_id.eq.${input.userId},receiver_id.eq.${input.otherUserId}),and(sender_id.eq.${input.otherUserId},receiver_id.eq.${input.userId})`,
      )
      .order('created_at', { ascending: false })
      .limit(input.limit ?? 50);

    if (input.before) {
      query = query.lt('created_at', toIso(input.before));
    }

    const { data, error } = await query;

    if (error || !data) {
      return err(error?.message ?? 'Unable to fetch messages', error?.code, error);
    }

    return ok((data as DbMessage[]).map(mapMessage).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
  },

  async sendMessage(input: {
    senderId: string;
    receiverId: string;
    content: string;
  }): Promise<AppResult<Message>> {
    if (!isSupabaseMessagesEnabled) {
      return ok({
        id: `message-${Date.now()}`,
        senderId: input.senderId,
        receiverId: input.receiverId,
        content: input.content,
        readAt: null,
        createdAt: new Date(),
      });
    }

    if (!input.senderId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('messages')
      .insert({
        sender_id: input.senderId,
        receiver_id: input.receiverId,
        content: input.content,
      })
      .select('id,sender_id,receiver_id,content,read_at,created_at')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to send message', error?.code, error);
    }

    return ok(mapMessage(data as DbMessage));
  },

  async markConversationRead(input: {
    readerId: string;
    otherUserId: string;
  }): Promise<AppResult<void>> {
    if (!isSupabaseMessagesEnabled) {
      return ok(undefined);
    }

    if (!input.readerId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('messages')
      .update({ read_at: toIso(new Date()) })
      .eq('sender_id', input.otherUserId)
      .eq('receiver_id', input.readerId)
      .is('read_at', null);

    if (error) {
      return err(error.message, error.code, error);
    }

    return ok(undefined);
  },
};
