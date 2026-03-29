import { supabase } from '@/lib/supabase';

export const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) return null;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) return null;
  return session.user.id;
};
