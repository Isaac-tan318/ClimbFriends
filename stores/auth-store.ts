import { create } from 'zustand';

import type { User } from '@/types';
import { authService } from '@/services/auth/auth-service';
import { err, ok, type AppResult } from '@/services/api/result';

type AuthState = {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  initialize: () => Promise<AppResult<User | null>>;
  signIn: (email: string, password: string) => Promise<AppResult<User>>;
  signUp: (email: string, password: string, displayName: string) => Promise<AppResult<User>>;
  signOut: () => Promise<AppResult<void>>;
  updateProfile: (partial: { displayName?: string; avatarUrl?: string | null }) => Promise<AppResult<User>>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    const result = await authService.getSessionUser();

    if (!result.ok) {
      set({ loading: false, initialized: true, error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set({ user: result.data, loading: false, initialized: true, error: null });
    return ok(result.data);
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    const result = await authService.signIn({ email, password });

    if (!result.ok) {
      set({ loading: false, error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set({ user: result.data, loading: false, initialized: true, error: null });
    return ok(result.data);
  },

  signUp: async (email, password, displayName) => {
    set({ loading: true, error: null });
    const result = await authService.signUp({ email, password, displayName });

    if (!result.ok) {
      set({ loading: false, error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set({ user: result.data, loading: false, initialized: true, error: null });
    return ok(result.data);
  },

  signOut: async () => {
    set({ loading: true, error: null });
    const result = await authService.signOut();

    if (!result.ok) {
      set({ loading: false, error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set({ user: null, loading: false, initialized: true, error: null });
    return ok(undefined);
  },

  updateProfile: async (partial) => {
    const user = get().user;
    if (!user) {
      return err('No authenticated user', 'NOT_AUTHENTICATED');
    }

    set({ loading: true, error: null });
    const result = await authService.updateProfile({
      userId: user.id,
      displayName: partial.displayName,
      avatarUrl: partial.avatarUrl,
    });

    if (!result.ok) {
      set({ loading: false, error: result.error.message });
      return err(result.error.message, result.error.code, result.error.details);
    }

    set({ user: result.data, loading: false, error: null });
    return ok(result.data);
  },
}));
