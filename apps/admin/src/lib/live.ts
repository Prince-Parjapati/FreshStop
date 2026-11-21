import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
/** Refetch the given query keys instantly when any of the tables change (Supabase realtime). Polling stays as a fallback. */
export function useLive(tables: string[], keys: string[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel('live-' + tables.join('-') + '-' + Math.random().toString(36).slice(2, 7));
    for (const table of tables) ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })));
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tables.join(','), keys.join(',')]);
}
export const trialOf = (u: { status: string; trial_ends_at?: string | null }) => {
  if (u.status === 'ACTIVE') return { label: 'PAID', tone: 'badge-green', days: null as number | null };
  if (u.status === 'BLOCKED') return { label: 'BLOCKED', tone: 'badge-red', days: null };
  if (!u.trial_ends_at) return { label: 'NOT STARTED', tone: 'badge-gray', days: null };
  const ms = new Date(u.trial_ends_at).getTime() - Date.now();
  if (ms > 0) { const d = Math.ceil(ms / 86400000); return { label: `TRIAL · ${d}d left`, tone: d <= 1 ? 'badge-amber' : 'badge-green', days: d }; }
  return { label: 'TRIAL ENDED', tone: 'badge-red', days: 0 };
};
export const ago = (iso?: string | null) => {
  if (!iso) return '—'; const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.floor(m / 60)}h ago`; return `${Math.floor(m / 1440)}d ago`;
};
