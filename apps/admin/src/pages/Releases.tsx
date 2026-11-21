import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
export default function Releases() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['versions'], queryFn: async () => (await supabase.from('app_versions').select('*').order('version_code', { ascending: false })).data ?? [] });
  const [f, setF] = useState({ version_name: '', version_code: '', apk_url: '', changelog: '', mandatory: false });
  const add = useMutation({ mutationFn: async () => { const { error } = await supabase.from('app_versions').insert({ ...f, version_code: Number(f.version_code) }); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ['versions'] }) });
  return (
    <div className="space-y-4"><h2 className="text-2xl font-bold">Releases</h2>
      <form className="card grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <input className="input" placeholder="Version name (1.0.1)" required value={f.version_name} onChange={(e) => setF({ ...f, version_name: e.target.value })} />
        <input className="input" placeholder="Version code (2)" type="number" required value={f.version_code} onChange={(e) => setF({ ...f, version_code: e.target.value })} />
        <input className="input md:col-span-2" placeholder="APK URL (GitHub Releases)" type="url" required value={f.apk_url} onChange={(e) => setF({ ...f, apk_url: e.target.value })} />
        <textarea className="input md:col-span-2 py-2" placeholder="Changelog" value={f.changelog} onChange={(e) => setF({ ...f, changelog: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.mandatory} onChange={(e) => setF({ ...f, mandatory: e.target.checked })} />Mandatory update</label>
        <button className="btn-primary">Publish</button>{add.error && <p role="alert" className="text-red-600">{String(add.error)}</p>}</form>
      <div className="card"><ul className="space-y-1 text-sm">{data.map((v: any) => <li key={v.id}><b>{v.version_name}</b> (#{v.version_code}) {v.mandatory && '· mandatory'} — {v.changelog}</li>)}</ul></div></div>
  );
}
