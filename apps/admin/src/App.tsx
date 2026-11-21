import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Approvals from './pages/Approvals';
import Users from './pages/Users';
import Payments from './pages/Payments';
import Releases from './pages/Releases';
import Announcements from './pages/Announcements';
import Settings from './pages/Settings';
import Audit from './pages/Audit';

const nav = [['/', 'Dashboard'], ['/approvals', 'Approvals'], ['/users', 'Users'], ['/payments', 'Payments'], ['/announcements', 'Announcements'], ['/releases', 'Releases'], ['/settings', 'Settings'], ['/audit', 'Audit']] as const;

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return setIsAdmin(null);
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data));
  }, [session]);
  if (session === undefined) return <p className="p-8">Loading…</p>;
  if (!session || isAdmin === false) return <Login denied={isAdmin === false} />;
  if (isAdmin === null) return <p className="p-8">Checking access…</p>;
  return (
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-20 w-56 border-r border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <h1 className="mb-6 text-lg font-bold text-brand">MandiMart Admin</h1>
        <nav className="flex flex-col gap-1">
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => `rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-soft text-brand-dark' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{label}</NavLink>
          ))}
        </nav>
        <button className="btn-ghost mt-6 w-full" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <button className="btn-ghost mb-4 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">☰ Menu</button>
        <Routes>
          <Route path="/" element={<Dashboard />} /><Route path="/approvals" element={<Approvals />} />
          <Route path="/users" element={<Users />} /><Route path="/payments" element={<Payments />} />
          <Route path="/announcements" element={<Announcements />} /><Route path="/releases" element={<Releases />} />
          <Route path="/settings" element={<Settings />} /><Route path="/audit" element={<Audit />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
