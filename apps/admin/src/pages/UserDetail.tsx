import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Smartphone, FileText, Users, Package, CalendarCheck, MousePointerClick, DatabaseBackup, MessageCircle } from 'lucide-react';
import { formatINR } from '@mandimart/shared';
import { supabase } from '../lib/supabase';
import { Initials, Status } from '../lib/ui';
import { ago, trialOf, useLive } from '../lib/live';

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
  <div className="card flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={18} /></span><div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-extrabold">{value}</p></div></div>
);
const dt = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—');

export default function UserDetail() {
  const { id = '' } = useParams(); const qc = useQueryClient(); useLive(['payment_requests', 'profiles', 'devices'], ['user', id]);
  const { data, isLoading, error } = useQuery({ queryKey: ['user', id], refetchInterval: 10000, queryFn: async () => {
    const [p, st, dev, lic, pay, tk, days, aud] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('usage_stats').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('devices').select('*').eq('user_id', id).order('last_seen', { ascending: false }),
      supabase.from('licences').select('*, plans(name)').eq('user_id', id).order('issued_at', { ascending: false }),
      supabase.from('payment_requests').select('*').eq('user_id', id).order('created_at', { ascending: false }),
      supabase.from('support_tickets').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('usage_days').select('day,opens').eq('user_id', id).order('day', { ascending: false }).limit(30),
      supabase.from('audit_log').select('*').eq('entity_id', id).order('created_at', { ascending: false }).limit(15),
    ]);
    if (p.error) throw p.error;
    return { p: p.data as any, st: st.data as any, dev: (dev.data ?? []) as any[], lic: (lic.data ?? []) as any[], pay: (pay.data ?? []) as any[], tk: (tk.data ?? []) as any[], days: (days.data ?? []) as any[], aud: (aud.data ?? []) as any[] };
  } });
  const act = useMutation({ mutationFn: async (f: () => PromiseLike<{ error: any }>) => { const r = await f(); if (r.error) throw r.error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ['user', id] }), onError: (e: any) => alert(e.message) });
  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (error || !data) return <p role="alert" className="text-red-600">Could not load this customer.</p>;
  const { p, st, dev, lic, pay, tk, days, aud } = data; const tr = trialOf(p);
  const waText = encodeURIComponent(`Hi ${p.full_name}, your Mandi Khata ${tr.label.startsWith('TRIAL ·') ? 'free trial is ending soon' : 'free trial'}. Pay once to keep using the app.`);
  return (
    <div className="space-y-6">
      <Link to="/users" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand"><ArrowLeft size={16} />All users</Link>
      <div className="card flex flex-wrap items-center gap-4">
        <Initials name={p.shop_name || p.full_name} />
        <div className="mr-auto"><h2 className="text-xl font-extrabold">{p.shop_name || p.full_name}</h2>
          <p className="text-sm text-slate-500">{p.full_name} · {p.phone ?? 'no phone'} · {p.email} · {p.city ?? '—'} · {p.user_code}</p>
          <div className="mt-2 flex flex-wrap gap-2"><Status s={p.status} /><span className={tr.tone}>{tr.label}</span></div></div>
        <div className="flex flex-wrap gap-2">
          {p.phone && <a className="btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/91${String(p.phone).replace(/\D/g, '').slice(-10)}?text=${waText}`}><MessageCircle size={16} />WhatsApp</a>}
          {[1, 3, 7].map((d) => <button key={d} className="btn-ghost" onClick={() => act.mutate(() => supabase.rpc('admin_extend_trial', { p_user: id, p_days: d }))}>+{d}d trial</button>)}
          {p.status === 'BLOCKED' ? <button className="btn-ghost" onClick={() => act.mutate(() => supabase.rpc('set_user_status', { p_user: id, p_status: 'ACTIVE', p_reason: null }))}>Unblock</button>
            : <button className="btn-danger" onClick={() => { const r = prompt('Block reason?'); if (r) act.mutate(() => supabase.rpc('set_user_status', { p_user: id, p_status: 'BLOCKED', p_reason: r })); }}>Block</button>}
          <button className="btn-ghost" onClick={() => act.mutate(() => supabase.from('devices').update({ is_active: false }).eq('user_id', id))}>Reset devices</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat icon={FileText} label="Vouchers" value={st?.vouchers_count ?? 0} /><Stat icon={Users} label="Parties" value={st?.parties_count ?? 0} /><Stat icon={Package} label="Items" value={st?.items_count ?? 0} />
        <Stat icon={MousePointerClick} label="App opens" value={st?.sessions ?? 0} /><Stat icon={CalendarCheck} label="Active days" value={days.length} /><Stat icon={DatabaseBackup} label="Last backup" value={ago(st?.last_backup_at)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h3 className="mb-3 font-bold">Account</h3>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
            <dt className="text-slate-500">Signed up</dt><dd>{dt(p.created_at)}</dd>
            <dt className="text-slate-500">Trial started</dt><dd>{dt(p.trial_started_at)}</dd>
            <dt className="text-slate-500">Trial ends</dt><dd>{dt(p.trial_ends_at)}</dd>
            <dt className="text-slate-500">Last seen</dt><dd>{dt(p.last_seen_at)} ({ago(p.last_seen_at)})</dd>
            <dt className="text-slate-500">App version</dt><dd>{p.app_version ?? '—'}</dd>
            <dt className="text-slate-500">Language</dt><dd>{p.language}</dd>
            <dt className="text-slate-500">Devices</dt><dd>{p.device_count}</dd>
          </dl></div>
        <div className="card"><h3 className="mb-3 font-bold">Activity · last 30 days</h3>
          {!days.length ? <p className="text-sm text-slate-500">No app activity recorded yet.</p> : (
            <div className="flex flex-wrap gap-1">{days.map((d: any) => <span key={d.day} title={`${d.day}: ${d.opens} opens`} className="rounded-md bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-dark dark:bg-emerald-950 dark:text-emerald-300">{String(d.day).slice(5)} · {d.opens}</span>)}</div>)}</div>
      </div>

      <div className="card overflow-x-auto p-0"><h3 className="p-4 font-bold">Devices</h3>
        <table className="w-full"><thead><tr><th className="th">Device</th><th className="th">OS</th><th className="th">First seen</th><th className="th">Last seen</th><th className="th">Active</th></tr></thead>
          <tbody>{dev.map((d) => <tr key={d.id} className="tr"><td className="td"><span className="inline-flex items-center gap-2"><Smartphone size={16} />{d.model ?? '—'} · {String(d.device_id_hash).slice(0, 8)}</span></td><td className="td">{d.os ?? '—'}</td><td className="td">{dt(d.first_seen)}</td><td className="td">{ago(d.last_seen)}</td><td className="td">{d.is_active ? 'Yes' : 'No'}</td></tr>)}
            {!dev.length && <tr><td className="td text-slate-500" colSpan={5}>No devices yet.</td></tr>}</tbody></table></div>

      <div className="card overflow-x-auto p-0"><h3 className="p-4 font-bold">Payments</h3>
        <table className="w-full"><thead><tr><th className="th">Date</th><th className="th">Amount</th><th className="th">UTR</th><th className="th">Payer</th><th className="th">Status</th></tr></thead>
          <tbody>{pay.map((r) => <tr key={r.id} className="tr"><td className="td">{dt(r.created_at)}</td><td className="td">{formatINR(r.amount_paise, { decimals: false })}</td><td className="td">{r.utr}</td><td className="td">{r.payer_name}</td><td className="td"><Status s={r.status} /></td></tr>)}
            {!pay.length && <tr><td className="td text-slate-500" colSpan={5}>No payments yet.</td></tr>}</tbody></table></div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h3 className="mb-3 font-bold">Licences</h3>{!lic.length && <p className="text-sm text-slate-500">No licence issued.</p>}
          <ul className="space-y-2 text-sm">{lic.map((l) => <li key={l.id} className="flex justify-between"><span>{l.plans?.name ?? 'Plan'} · {dt(l.issued_at)}</span><Status s={l.status} /></li>)}</ul></div>
        <div className="card"><h3 className="mb-3 font-bold">Support tickets</h3>{!tk.length && <p className="text-sm text-slate-500">No tickets.</p>}
          <ul className="space-y-2 text-sm">{tk.map((t) => <li key={t.id} className="flex justify-between gap-3"><span className="truncate">{t.subject}</span><Status s={t.status} /></li>)}</ul></div>
      </div>
      <div className="card"><h3 className="mb-3 font-bold">Admin history</h3>{!aud.length && <p className="text-sm text-slate-500">Nothing yet.</p>}
        <ul className="space-y-1 text-sm">{aud.map((a) => <li key={a.id} className="flex justify-between"><span>{a.action}</span><span className="text-slate-500">{dt(a.created_at)}</span></li>)}</ul></div>
    </div>
  );
}
