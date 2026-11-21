import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
export default function Audit() {
  const { data = [] } = useQuery({ queryKey: ['audit'], queryFn: async () => (await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200)).data ?? [] });
  return (<div className="space-y-4"><h2 className="text-2xl font-bold">Audit log</h2><div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr>{['When', 'Action', 'Entity', 'Meta'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
    <tbody>{data.map((a: any) => <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800"><td className="td">{new Date(a.created_at).toLocaleString()}</td><td className="td">{a.action}</td><td className="td">{a.entity} {a.entity_id}</td><td className="td font-mono text-xs">{JSON.stringify(a.meta)}</td></tr>)}</tbody></table></div></div>);
}
