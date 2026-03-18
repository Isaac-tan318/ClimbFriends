import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { CURRENT_USER } from '@/data/mock-users';
import { getSupabaseClient, hasSupabaseConfig, supabase } from '@/lib/supabase';
import type { User } from '@/types';

import { fromIsoOrNow } from '@/services/api/date';
import { err, ok, type AppResult } from '@/services/api/result';

type DbProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

const mapProfile = (row: DbProfileRow): User => ({
  id: row.id,
  email: row.email ?? '',
  displayName: row.display_name ?? 'Climber',
  avatarUrl: row.avatar_url ?? undefined,
  createdAt: fromIsoOrNow(row.created_at),
});

const mapSessionUser = (input: {
  id: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
}): User => ({
  id: input.id,
  email: input.email ?? '',
  displayName: input.displayName?.trim() || 'Climber',
  avatarUrl: input.avatarUrl ?? undefined,
  createdAt: fromIsoOrNow(input.createdAt),
});

const resolveAuthenticatedUser = async (authUser: SupabaseAuthUser): Promise<User> => {
  const fallbackUser = mapSessionUser({
    id: authUser.id,
    email: authUser.email,
    displayName:
      (authUser.user_metadata?.display_name as string | undefined) ??
      (authUser.user_metadata?.full_name as string | undefined) ??
      null,
    avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
    createdAt: authUser.created_at ?? null,
  });

  try {
    const client = getSupabaseClient();
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id,email,display_name,avatar_url,created_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError) {
      console.warn('Profile lookup failed during auth resolution:', profileError.message);
      return fallbackUser;
    }

    if (profile) {
      return mapProfile(profile as DbProfileRow);
    }

    const seededProfile = await upsertProfile({
      id: authUser.id,
      email: authUser.email ?? undefined,
      displayName: authUser.user_metadata?.display_name as string | undefined,
      avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
    });

    if (!seededProfile.ok) {
      console.warn('Profile seed failed during auth resolution:', seededProfile.error.message);
      return fallbackUser;
    }

    return seededProfile.data;
  } catch (unknownError) {
    console.warn('Unexpected profile resolution failure:', unknownError);
    return fallbackUser;
  }
};

const upsertProfile = async (input: {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string | null;
}): Promise<AppResult<User>> => {
  if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth) {
    return ok(CURRENT_USER);
  }

  try {
    const client = getSupabaseClient();
    const payload = {
      id: input.id,
      email: input.email ?? null,
      display_name: input.displayName ?? null,
      avatar_url: input.avatarUrl ?? null,
    };

    const { data, error } = await client
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('id,email,display_name,avatar_url,created_at')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to save profile', error?.code, error);
    }

    return ok(mapProfile(data as DbProfileRow));
  } catch (unknownError) {
    return err('Unexpected profile upsert error', 'UNEXPECTED', unknownError);
  }
};

export const authService = {
  async getSessionUser(): Promise<AppResult<User | null>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth || !supabase) {
      return ok(CURRENT_USER);
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return err(error.message, error.code, error);
    }

    const user = session?.user ?? null;
    if (!user) {
      return ok(null);
    }

    return ok(await resolveAuthenticatedUser(user));
  },

  async signUp(params: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<
    AppResult<{
      user: User;
      sessionStarted: boolean;
      requiresEmailConfirmation: boolean;
    }>
  > {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth || !supabase) {
      return ok({
        user: CURRENT_USER,
        sessionStarted: true,
        requiresEmailConfirmation: false,
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          display_name: params.displayName,
        },
      },
    });

    if (error || !data.user) {
      return err(error?.message ?? 'Unable to sign up', error?.code, error);
    }

    const fallbackUser = mapSessionUser({
      id: data.user.id,
      email: data.user.email ?? params.email,
      displayName:
        (data.user.user_metadata?.display_name as string | undefined) ?? params.displayName,
      avatarUrl: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
      createdAt: data.user.created_at ?? null,
    });

    if (!data.session) {
      return ok({
        user: fallbackUser,
        sessionStarted: false,
        requiresEmailConfirmation: true,
      });
    }

    return ok({
      user: await resolveAuthenticatedUser(data.user),
      sessionStarted: true,
      requiresEmailConfirmation: false,
    });
  },

  async signIn(params: { email: string; password: string }): Promise<AppResult<User>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth || !supabase) {
      return ok(CURRENT_USER);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error || !data.user) {
      return err(error?.message ?? 'Unable to sign in', error?.code, error);
    }

    return ok(await resolveAuthenticatedUser(data.user));
  },

  async signOut(options?: { scope?: 'global' | 'local' | 'others' }): Promise<AppResult<void>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth || !supabase) {
      return ok(undefined);
    }

    console.log(`\n🚪 Initiating Supabase signOut with scope:`, options?.scope || 'global');
    try {
      const { error } = await supabase.auth.signOut(options);

      if (error) {
        console.error("🚪 Supabase returned an error during signOut:", error);
        return err(error.message, error.code, error);
      }

      console.log("🚪 Supabase signOut promise resolved successfully!");
      return ok(undefined);
    } catch (e) {
      console.error("🚪 FATAL: Supabase signOut threw a raw exception:", e);
      return err('Unexpected error during sign out', 'FATAL', e);
    }
  },

  async updateProfile(params: {
    userId: string;
    displayName?: string;
    avatarUrl?: string | null;
  }): Promise<AppResult<User>> {
    return upsertProfile({
      id: params.userId,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl ?? null,
    });
  },
};
