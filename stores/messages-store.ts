import { create } from 'zustand';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { hasSupabaseConfig } from '@/lib/supabase';
import type { Message } from '@/types';
import { getCurrentUserId } from '@/services/auth/current-user';
import { messageService } from '@/services/messages/message-service';
import { err, ok, type AppResult } from '@/services/api/result';

type MessageState = {
  conversations: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
  loadConversation: (otherUserId: string) => Promise<AppResult<Message[]>>;
  sendMessage: (otherUserId: string, content: string) => Promise<AppResult<Message>>;
  markConversationRead: (otherUserId: string) => Promise<AppResult<void>>;
};

const DEFAULT_USER_ID = 'user-1';
const useMockMessages = !hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseMessages;

const resolveUserId = async (): Promise<string | null> => {
  const userId = await getCurrentUserId();
  if (userId) return userId;
  return useMockMessages ? DEFAULT_USER_ID : null;
};

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: {},
  loading: false,
  error: null,

  loadConversation: async (otherUserId) => {
    set({ loading: true, error: null });
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const result = await messageService.getConversation({
      userId,
      otherUserId,
    });

    if (!result.ok) {
      set({ loading: false, error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      conversations: {
        ...state.conversations,
        [otherUserId]: result.data,
      },
      loading: false,
      error: null,
    }));

    return ok(result.data);
  },

  sendMessage: async (otherUserId, content) => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const result = await messageService.sendMessage({
      senderId: userId,
      receiverId: otherUserId,
      content,
    });

    if (!result.ok) {
      set({ error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      conversations: {
        ...state.conversations,
        [otherUserId]: [...(state.conversations[otherUserId] ?? []), result.data],
      },
      error: null,
    }));

    return ok(result.data);
  },

  markConversationRead: async (otherUserId) => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const result = await messageService.markConversationRead({
      readerId: userId,
      otherUserId,
    });

    if (!result.ok) {
      set({ error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      conversations: {
        ...state.conversations,
        [otherUserId]: (state.conversations[otherUserId] ?? []).map((message) =>
          message.receiverId === userId && message.senderId === otherUserId
            ? { ...message, readAt: message.readAt ?? new Date() }
            : message,
        ),
      },
      error: null,
    }));

    return ok(undefined);
  },
}));
