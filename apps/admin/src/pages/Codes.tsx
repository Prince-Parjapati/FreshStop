import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
export default function Codes() {
  const qc = useQueryClient(); const [f, setF] = useState({ code: '', percent: '', amount: '', max: '' });
  const { data = [] } = useQuery({ queryKey: ['codes'], queryFn: async () => (await supabase.from('discount_codes').select('*')).data ?? [] });
  const inv = () => qc.invalidateQueries({ queryKey: ['codes'] });
  const add = useMutation({ mutationFn: async () => { const { error } = await supabase.from('discount_codes').insert({ code: f.code.trim().toUpperCase(), percent: f.percent ? Number(f.percent) : null, amount_paise: f.amount ? Math.round(Number(f.amount) * 100) : null, max_uses: f.max ? Number(f.max) : null }); if (error) throw error; setF({ code: '', percent: '', amount: '', max: '' }); }, onSuccess: inv });
  const del = useMutation({ mutationFn: async (c: string) => { await supabase.from('discount_codes').delete().eq('code', c); }, onSuccess: inv });
  return (
    <div className="space-y-4"><h2 className="text-2xl font-bold">Discount codes</h2>
      <form className="card grid gap-3 md:grid-cols-5" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <input className="input" placeholder="CODE" required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <input className="input" type="number" min="1" max="100" placeholder="% off" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} />
        <input className="input" type="number" min="0" placeholder="₹ off" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <input className="input" type="number" min="1" placeholder="Max uses" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} />
        <button className="btn-primary">Create</button>{add.error && <p role="alert" className="text-red-600 md:col-span-5">{String((add.error as Error).message ?? add.error)}</p>}</form>
      <div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr>{['Code', '% off', '₹ off', 'Used / Max', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{data.map((c: any) => <tr key={c.code} className="border-t border-slate-100 dark:border-slate-800"><td className="td font-mono">{c.code}</td><td className="td">{c.percent ?? '—'}</td><td className="td">{c.amount_paise ? c.amount_paise / 100 : '—'}</td><td className="td">{c.used} / {c.max_uses ?? '∞'}</td><td className="td"><button className="btn-ghost" onClick={() => del.mutate(c.code)}>Delete</button></td></tr>)}</tbody></table></div></div>
  );
}
