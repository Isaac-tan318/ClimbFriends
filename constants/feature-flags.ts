const readBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const FEATURE_FLAGS = {
  useSupabaseAuth: readBool(process.env.EXPO_PUBLIC_FEATURE_AUTH, true),
  useSupabaseSessions: readBool(process.env.EXPO_PUBLIC_FEATURE_SESSIONS, true),
  useSupabaseFeed: readBool(process.env.EXPO_PUBLIC_FEATURE_FEED, true),
  useSupabaseSocial: readBool(process.env.EXPO_PUBLIC_FEATURE_SOCIAL, true),
  useSupabaseMessages: readBool(process.env.EXPO_PUBLIC_FEATURE_MESSAGES, true),
  useSupabaseNotifications: readBool(process.env.EXPO_PUBLIC_FEATURE_NOTIFICATIONS, true),
  useSupabasePresence: readBool(process.env.EXPO_PUBLIC_FEATURE_PRESENCE, true),
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
