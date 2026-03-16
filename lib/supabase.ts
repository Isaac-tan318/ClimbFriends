import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log("🛠️ --- SUPABASE INIT ---");
console.log("URL:", supabaseUrl);
console.log("Key exists?:", !!supabasePublishableKey);

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

const authStorage = Platform.OS === 'web' ? undefined : AsyncStorage;

// 🕵️ THE WIRETAP: Intercepts all Supabase network traffic
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  console.log(`\n🌐 [NETWORK OUT] -> ${options?.method || 'GET'} ${url}`);
  try {
    const response = await fetch(url, options);
    console.log(`✅ [NETWORK IN] <- ${response.status} ${url}`);
    return response;
  } catch (err: any) {
    console.error(`❌ [NETWORK FATAL] ERROR on ${url}:`);
    console.error(err); // Prints the raw error object, not just the string
    throw err;
  }
};

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: authStorage,
      },
      global: {
        fetch: customFetch, // <-- Injecting the wiretap here
      },
      realtime: {
        params: {
          eventsPerSecond: 5,
        },
      },
    })
  : null;

if (Platform.OS !== 'web' && supabase) {
  const syncAutoRefresh = (state: AppStateStatus) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
      return;
    }

    void supabase.auth.stopAutoRefresh();
  };

  syncAutoRefresh(AppState.currentState);
  AppState.addEventListener('change', syncAutoRefresh);
}

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return supabase;
};