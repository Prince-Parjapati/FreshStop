import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
export default function Announcements() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['ann'], queryFn: async () => (await supabase.from('announcements').select('*').order('created_at', { ascending: false })).data ?? [] });
  const [f, setF] = useState({ title: '', body: '', type: 'info' });
  const inv = () => qc.invalidateQueries({ queryKey: ['ann'] });
  const add = useMutation({ mutationFn: async () => { const { error } = await supabase.from('announcements').insert(f); if (error) throw error; }, onSuccess: () => { setF({ title: '', body: '', type: 'info' }); inv(); } });
  const toggle = useMutation({ mutationFn: async (a: any) => { await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id); }, onSuccess: inv });
  return (
    <div className="space-y-4"><h2 className="text-2xl font-bold">Announcements</h2>
      <form className="card grid gap-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <input className="input" placeholder="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="input py-2" placeholder="Message" required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['info', 'warning', 'promo', 'maintenance'].map((t) => <option key={t}>{t}</option>)}</select>
        <button className="btn-primary">Broadcast</button></form>
      {data.map((a: any) => <div key={a.id} className="card flex items-center justify-between"><div><b>{a.title}</b> <span className="text-xs text-slate-500">({a.type})</span><p className="text-sm">{a.body}</p></div><button className="btn-ghost" onClick={() => toggle.mutate(a)}>{a.is_active ? 'Disable' : 'Enable'}</button></div>)}</div>
  );
}
