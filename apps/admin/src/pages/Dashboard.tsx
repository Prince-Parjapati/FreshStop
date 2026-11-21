import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '@mandimart/shared';
import { supabase } from '../lib/supabase';
const Tile = ({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) => (
  <div className="card"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${accent ? 'text-amber' : ''}`}>{value}</p></div>
);
export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dash'], queryFn: async () => { const r = await supabase.rpc('admin_dashboard'); if (r.error) throw r.error; return r.data as any; }, refetchInterval: 30000 });
  if (isLoading) return <p>Loading…</p>;
  if (error || !data) return <p role="alert" className="text-red-600">Failed to load.</p>;
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Total users" value={data.total_users} /><Tile label="Pending approvals" value={data.pending_payments} accent />
        <Tile label="Active" value={data.active} /><Tile label="Blocked" value={data.blocked} />
        <Tile label="Revenue (month)" value={formatINR(data.revenue_month, { decimals: false })} /><Tile label="Revenue (all)" value={formatINR(data.revenue_all, { decimals: false })} />
      </div>
      <div className="card"><h3 className="mb-2 font-semibold">Signups (30 days)</h3>
        <div className="h-56"><ResponsiveContainer><BarChart data={data.signups_30d}><XAxis dataKey="d" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={28} /><Tooltip /><Bar dataKey="n" fill="#16A34A" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className="card"><h3 className="mb-2 font-semibold">App versions</h3>
        <ul className="text-sm">{Object.entries(data.versions ?? {}).map(([v, n]) => <li key={v}>{v}: {String(n)}</li>)}</ul></div>
    </div>
  );
}
