import { supabase } from './supabase';
export async function publicSettings(): Promise<Record<string, any>> {
  const { data } = await supabase.from('public_settings').select('*');
  return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
}
