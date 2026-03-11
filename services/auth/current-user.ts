import { supabase } from '@/lib/supabase';

export const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user.id;
};
