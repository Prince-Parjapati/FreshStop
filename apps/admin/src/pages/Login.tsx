import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
export default function Login({ denied }: { denied?: boolean }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message); setBusy(false);
  };
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-deep p-12 text-white md:flex md:flex-col md:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" /><div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-12 w-12 rounded-2xl" /><span className="text-xl font-extrabold">Mandi Khata</span></div>
        <div className="relative"><h1 className="text-4xl font-extrabold leading-tight">Run your licences,<br />payments and users<br />from one place.</h1><p className="mt-4 max-w-sm text-emerald-100/70">Approve UTR payments, manage customers, push updates and announcements.</p></div>
        <p className="relative text-xs text-emerald-100/50">Admin access only</p>
      </div>
      <div className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand"><ShieldCheck /></span>
          <div><h2 className="text-2xl font-extrabold">Admin sign in</h2><p className="text-sm text-slate-500">Use your administrator account.</p></div>
          {denied && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">This account is not an admin.</p>}
          <label className="block text-sm font-semibold">Email<input className="input mt-1 font-normal" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
          <label className="block text-sm font-semibold">Password<input className="input mt-1 font-normal" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          {denied && <button type="button" className="btn-ghost w-full" onClick={() => supabase.auth.signOut()}>Use another account</button>}
        </form>
      </div>
    </div>
  );
}
