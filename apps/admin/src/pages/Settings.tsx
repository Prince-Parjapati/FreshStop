import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
const FIELDS: [string, string][] = [['upi_id', 'UPI ID'], ['upi_name', 'UPI payee name'], ['whatsapp', 'WhatsApp number (91XXXXXXXXXX)'], ['support_text', 'Support text'], ['min_version_code', 'Min supported version code (force update)'], ['licence_grace_days', 'Offline grace days']];
export default function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: async () => Object.fromEntries(((await supabase.from('app_settings').select('*')).data ?? []).map((r: any) => [r.key, r.value])) });
  const [v, setV] = useState<Record<string, any>>({}); const [price, setPrice] = useState(''); const [msg, setMsg] = useState('');
  useEffect(() => { if (data) setV(data); }, [data]);
  useEffect(() => { supabase.from('plans').select('price_paise').eq('is_active', true).limit(1).maybeSingle().then(({ data }) => data && setPrice(String(data.price_paise / 100))); }, []);
  const save = async () => {
    const rows = [...FIELDS.map(([k]) => k), 'maintenance'].map((key) => ({ key, value: ['min_version_code', 'licence_grace_days'].includes(key) ? Number(v[key] ?? 0) : v[key] ?? '' }));
    const r = await supabase.from('app_settings').upsert(rows);
    const p = await supabase.from('plans').update({ price_paise: Math.round(Number(price) * 100) }).eq('is_active', true);
    setMsg(r.error || p.error ? 'Error: ' + (r.error || p.error)!.message : 'Saved'); qc.invalidateQueries({ queryKey: ['settings'] });
  };
  return (
    <div className="max-w-xl space-y-4"><h2 className="text-2xl font-bold">Settings</h2>
      <div className="card space-y-3">
        <label className="block text-sm">Lifetime price (₹)<input className="input mt-1" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        {FIELDS.map(([k, label]) => <label key={k} className="block text-sm">{label}<input className="input mt-1" value={String(v[k] ?? '')} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>)}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v.maintenance} onChange={(e) => setV({ ...v, maintenance: e.target.checked })} />Maintenance mode</label>
        <button className="btn-primary" onClick={save}>Save</button>{msg && <p role="status" className="text-sm">{msg}</p>}</div></div>
  );
}
