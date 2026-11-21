import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, csv } from '../lib/supabase';
export default function Users() {
  const qc = useQueryClient(); const [q, setQ] = useState(''); const [status, setStatus] = useState('');
  const { data = [], isLoading } = useQuery({ queryKey: ['users', q, status], queryFn: async () => {
    let s = supabase.from('profiles').select('*, usage_stats(vouchers_count,parties_count,items_count,last_backup_at)').eq('role', 'user').order('created_at', { ascending: false }).limit(200);
    if (status) s = s.eq('status', status as any);
    const t = q.trim().replace(/[%,]/g, ''); if (t) s = s.or(`full_name.ilike.%${t}%,shop_name.ilike.%${t}%,phone.ilike.%${t}%,user_code.ilike.%${t}%`);
    const { data, error } = await s; if (error) throw error; return data as any[];
  } });
  const setSt = useMutation({ mutationFn: async ({ id, st, reason }: any) => { const { error } = await supabase.rpc('set_user_status', { p_user: id, p_status: st, p_reason: reason ?? null }); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
  const resetDev = async (id: string) => { await supabase.from('devices').update({ is_active: false }).eq('user_id', id); alert('Devices reset'); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><h2 className="mr-auto text-2xl font-bold">Users</h2>
        <input className="input max-w-xs" placeholder="Search name/shop/phone/code" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-36" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{['PENDING', 'ACTIVE', 'BLOCKED', 'EXPIRED', 'REJECTED'].map((s) => <option key={s}>{s}</option>)}</select>
        <button className="btn-ghost" onClick={() => csv(data.map(({ usage_stats, ...r }) => r), 'users')}>CSV</button></div>
      <div className="card overflow-x-auto p-0">{isLoading ? <p className="p-4">Loading…</p> : (
        <table className="w-full"><thead><tr><th className="th">User</th><th className="th">City</th><th className="th">Status</th><th className="th">Last seen</th><th className="th">Ver</th><th className="th">Usage</th><th className="th"></th></tr></thead>
          <tbody>{data.map((u) => (
            <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="td"><b>{u.shop_name}</b><br /><span className="text-slate-500">{u.full_name} · {u.phone} · {u.user_code}</span></td>
              <td className="td">{u.city}</td><td className="td">{u.status}</td>
              <td className="td">{u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString() : '—'}</td><td className="td">{u.app_version ?? '—'}</td>
              <td className="td">{u.usage_stats ? `${u.usage_stats.vouchers_count}v ${u.usage_stats.parties_count}p ${u.usage_stats.items_count}i` : '—'}</td>
              <td className="td"><div className="flex gap-1">
                {u.status === 'BLOCKED' ? <button className="btn-ghost" onClick={() => setSt.mutate({ id: u.id, st: 'ACTIVE' })}>Unblock</button>
                  : <button className="btn-danger" onClick={() => { const r = prompt('Block reason?'); if (r) setSt.mutate({ id: u.id, st: 'BLOCKED', reason: r }); }}>Block</button>}
                <button className="btn-ghost" onClick={() => resetDev(u.id)}>Reset device</button></div></td>
            </tr>))}</tbody></table>)}</div>
    </div>
  );
}
