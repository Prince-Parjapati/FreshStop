import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react';
import { BadgeCheck, Bell, FileText, LayoutDashboard, LifeBuoy, LogOut, Menu, Rocket, Settings as Cog, ShieldCheck, Tag, Users as UsersIcon, Wallet, X } from 'lucide-react';
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
import Support from './pages/Support';
import Codes from './pages/Codes';
import UserDetail from './pages/UserDetail';

type NavItem = [string, string, LucideIcon];
const groups: [string, NavItem[]][] = [
  ['Overview', [['/', 'Dashboard', LayoutDashboard], ['/approvals', 'Approvals', BadgeCheck]]],
  ['Customers', [['/users', 'Users', UsersIcon], ['/payments', 'Payments', Wallet], ['/support', 'Support', LifeBuoy]]],
  ['Growth', [['/codes', 'Discount codes', Tag], ['/announcements', 'Announcements', Bell], ['/releases', 'Releases', Rocket]]],
  ['System', [['/settings', 'Settings', Cog], ['/audit', 'Audit log', FileText]]],
];
const flat = groups.flatMap(([, items]) => items);

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false); const loc = useLocation();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (!session) return setIsAdmin(null); supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data)); }, [session]);
  useEffect(() => setOpen(false), [loc.pathname]);
  if (session === undefined) return <p className="p-8 text-slate-500">Loading…</p>;
  if (!session || isAdmin === false) return <Login denied={isAdmin === false} />;
  if (isAdmin === null) return <p className="p-8 text-slate-500">Checking access…</p>;
  const title = flat.find(([to]) => to === loc.pathname)?.[1] ?? (loc.pathname.startsWith('/users/') ? 'Customer' : 'Dashboard');
  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-10 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-brand-deep p-4 text-white transition md:sticky md:top-0 md:h-screen md:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <div className="mb-6 flex items-center gap-3 px-2"><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-10 w-10 rounded-xl" /><div><p className="font-extrabold leading-tight">Mandi Khata</p><p className="text-xs text-emerald-200/70">Admin console</p></div>
          <button className="ml-auto md:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20} /></button></div>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {groups.map(([g, items]) => (
            <div key={g}><p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-widest text-emerald-200/50">{g}</p>
              {items.map(([to, label, Icon]) => (
                <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-white text-brand-deep shadow' : 'text-emerald-50/80 hover:bg-white/10'}`}><Icon size={18} />{label}</NavLink>))}
            </div>))}
        </nav>
        <button className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-50/80 hover:bg-white/10" onClick={() => supabase.auth.signOut()}><LogOut size={18} />Sign out</button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200/70 bg-[#F3F6F4]/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-[#08100B]/90 md:px-8">
          <button className="btn-ghost md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <h1 className="text-sm font-bold text-slate-500">{title}</h1>
          <span className="ml-auto flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="text-brand" />{session.user.email}</span>
        </header>
        <main className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} /><Route path="/approvals" element={<Approvals />} />
            <Route path="/users" element={<Users />} /><Route path="/users/:id" element={<UserDetail />} /><Route path="/payments" element={<Payments />} />
            <Route path="/announcements" element={<Announcements />} /><Route path="/releases" element={<Releases />} />
            <Route path="/support" element={<Support />} /><Route path="/codes" element={<Codes />} />
            <Route path="/settings" element={<Settings />} /><Route path="/audit" element={<Audit />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
