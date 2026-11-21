import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
const store = {
  getItem: (k: string) => SecureStore.getItemAsync(k.replace(/[^\w.-]/g, '_')),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k.replace(/[^\w.-]/g, '_'), v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k.replace(/[^\w.-]/g, '_')),
};
export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'anon', {
  auth: { storage: store as any, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
