import { useState } from 'react';
import { supabase } from '../lib/supabase';
export default function Login({ denied }: { denied?: boolean }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message); setBusy(false);
  };
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-brand">MandiMart Admin</h1>
        {denied && <p role="alert" className="text-sm text-red-600">This account is not an admin.</p>}
        <label className="block text-sm">Email<input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label className="block text-sm">Password<input className="input mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {denied && <button type="button" className="btn-ghost w-full" onClick={() => supabase.auth.signOut()}>Use another account</button>}
      </form>
    </div>
  );
}
