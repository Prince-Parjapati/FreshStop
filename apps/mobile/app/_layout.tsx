import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../src/lib/supabase';
import { checkLicence } from '../src/lib/licence';
import { useApp } from '../src/lib/store';
import { T, Screen } from '../src/ui/kit';
import AppLock from '../src/ui/AppLock';
import { useSettings } from '../src/i18n';

const qc = new QueryClient();
export default function Root() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const { gate, setGate } = useApp();
  const router = useRouter(); const hydrate = useSettings((s) => s.hydrate);
  useEffect(() => { hydrate(); }, []);
  const seg = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setAuthed(!!data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (authed) checkLicence().then(setGate); else setGate(null); }, [authed]);

  useEffect(() => {
    if (!ready) return;
    const top = seg[0] as string | undefined;
    if (!authed) { if (top !== 'auth') router.replace('/auth'); return; }
    if (!gate) return;
    const ok = gate.kind === 'OK' || gate.kind === 'WARN';
    if (ok) { if (top === 'auth' || top === 'pay' || top === 'locked') router.replace('/(tabs)'); }
    else if (gate.kind === 'NO_LICENCE') { if (top !== 'pay') router.replace('/pay'); }
    else if (top !== 'locked') router.replace('/locked');
  }, [ready, authed, gate, seg]);

  if (!ready) return <Screen><T>Loading…</T></Screen>;
  return (
    <QueryClientProvider client={qc}>
      <StatusBar style="auto" />
      <AppLock><Stack screenOptions={{ headerShown: false }} /></AppLock>
    </QueryClientProvider>
  );
}
