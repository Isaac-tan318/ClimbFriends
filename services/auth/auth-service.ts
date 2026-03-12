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
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return err(error.message, error.code, error);
    }

    if (!user) {
      return ok(null);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,email,display_name,avatar_url,created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return err(profileError.message, profileError.code, profileError);
    }

    if (profile) {
      return ok(mapProfile(profile as DbProfileRow));
    }

    const seededProfile = await upsertProfile({
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name as string | undefined,
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    });

    if (!seededProfile.ok) return seededProfile;
    return ok(seededProfile.data);
  },

  async signUp(params: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<AppResult<User>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth || !supabase) {
      return ok(CURRENT_USER);
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

    return ok({
      id: data.user.id,
      email: data.user.email || params.email,
      displayName: params.displayName,
      createdAt: new Date()
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

    const profileResult = await this.getSessionUser();
    if (!profileResult.ok || !profileResult.data) {
      return err('Signed in but profile lookup failed');
    }

    return ok(profileResult.data);
  },

  async signOut(): Promise<AppResult<void>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseAuth || !supabase) {
      return ok(undefined);
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      return err(error.message, error.code, error);
    }

    return ok(undefined);
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
