import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BadgeCheck, IndianRupee, Ban, Users, UserCheck, TrendingUp, Timer, Hourglass, Activity } from 'lucide-react';
import { formatINR } from '@mandimart/shared';
import { supabase } from '../lib/supabase';
import { PageHead } from '../lib/ui';
import { useLive } from '../lib/live';

const Stat = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) => (
  <div className="card flex items-center gap-4"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon size={22} /></span>
    <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-2xl font-extrabold tracking-tight">{value}</p></div></div>
);
export default function Dashboard() {
  useLive(['payment_requests', 'profiles'], ['dash']);
  const { data, isLoading, error } = useQuery({ queryKey: ['dash'], queryFn: async () => { const r = await supabase.rpc('admin_dashboard'); if (r.error) throw r.error; return r.data as any; }, refetchInterval: 8000, refetchIntervalInBackground: true, staleTime: 0 });
  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (error || !data) return <p role="alert" className="text-red-600">Failed to load.</p>;
  const versions = Object.entries(data.versions ?? {}) as [string, number][]; const vmax = Math.max(1, ...versions.map(([, n]) => Number(n)));
  return (
    <div className="space-y-6">
      <PageHead title="Dashboard" sub="Live overview of licences, revenue and signups" />
      {data.pending_payments > 0 && (
        <Link to="/approvals" className="flex items-center gap-4 rounded-2xl bg-brand-deep p-5 text-white shadow-card transition hover:brightness-110">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><BadgeCheck /></span>
          <div className="mr-auto"><p className="text-lg font-extrabold">{data.pending_payments} payment{data.pending_payments > 1 ? 's' : ''} waiting for approval</p><p className="text-sm text-emerald-100/70">Customers are waiting to unlock the app.</p></div><ArrowRight />
        </Link>)}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat icon={IndianRupee} label="Revenue this month" value={formatINR(data.revenue_month, { decimals: false })} tone="bg-emerald-100 text-emerald-700" />
        <Stat icon={TrendingUp} label="Revenue all time" value={formatINR(data.revenue_all, { decimals: false })} tone="bg-sky-100 text-sky-700" />
        <Stat icon={Users} label="Total users" value={data.total_users} tone="bg-violet-100 text-violet-700" />
        <Stat icon={UserCheck} label="Active licences" value={data.active} tone="bg-emerald-100 text-emerald-700" />
        <Stat icon={BadgeCheck} label="Pending approvals" value={data.pending_payments} tone="bg-amber-100 text-amber-700" />
        <Stat icon={Ban} label="Blocked" value={data.blocked} tone="bg-red-100 text-red-700" />
      </div>
      <div><h3 className="mb-3 font-bold">Free trial funnel</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Timer} label="In free trial" value={data.in_trial ?? 0} tone="bg-sky-100 text-sky-700" />
          <Stat icon={Hourglass} label="Trial ends within 24h" value={data.trial_expiring ?? 0} tone="bg-amber-100 text-amber-700" />
          <Stat icon={Ban} label="Trial ended, not paid" value={data.trial_ended_unpaid ?? 0} tone="bg-red-100 text-red-700" />
          <Stat icon={TrendingUp} label="Trial → paid" value={`${data.converted ?? 0}${(data.converted ?? 0) + (data.trial_ended_unpaid ?? 0) > 0 ? ` (${Math.round(((data.converted ?? 0) / ((data.converted ?? 0) + (data.trial_ended_unpaid ?? 0))) * 100)}%)` : ''}`} tone="bg-emerald-100 text-emerald-700" />
        </div>
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Activity size={14} />{data.active_today ?? 0} users opened the app in the last 24h · {data.active_7d ?? 0} in the last 7 days</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2"><h3 className="mb-4 font-bold">Signups · last 30 days</h3>
          <div className="h-64"><ResponsiveContainer><AreaChart data={data.signups_30d}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0F8A4F" stopOpacity={0.35} /><stop offset="100%" stopColor="#0F8A4F" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="n" stroke="#0F8A4F" strokeWidth={2.5} fill="url(#g)" /></AreaChart></ResponsiveContainer></div></div>
        <div className="card"><h3 className="mb-4 font-bold">App versions in use</h3>
          {!versions.length && <p className="text-sm text-slate-500">No data yet.</p>}
          <ul className="space-y-3">{versions.map(([v, n]) => <li key={v}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold">v{v}</span><span className="text-slate-500">{String(n)} users</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-brand" style={{ width: `${(Number(n) / vmax) * 100}%` }} /></div></li>)}</ul></div>
      </div>
    </div>
  );
}
