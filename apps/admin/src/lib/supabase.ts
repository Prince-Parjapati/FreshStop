import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost', import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'anon', {
  auth: { persistSession: true, autoRefreshToken: true },
});
export const csv = (rows: Record<string, unknown>[], name: string) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]!);
  const body = [keys.join(','), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = name + '.csv'; a.click();
};
