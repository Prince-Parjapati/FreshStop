import { Sentry } from '../src/lib/sentry';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../src/lib/supabase';
import { checkLicence, trialInfo } from '../src/lib/licence';
import { useApp } from '../src/lib/store';
import { T, Screen } from '../src/ui/kit';
import AppLock from '../src/ui/AppLock';
import { useSettings } from '../src/i18n';
import { useTheme } from '../src/ui/theme';

const qc = new QueryClient();
function Root() {
  const { c } = useTheme();
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
    const trial = !!trialInfo(gate);
    const trialOver = gate.kind === 'EXPIRED' && gate.claims.status === 'TRIAL';
    if (ok) { if (top === 'auth' || top === 'locked' || (top === 'pay' && !trial)) router.replace('/(tabs)'); }
    else if (gate.kind === 'NO_LICENCE' || trialOver) { if (top !== 'pay') router.replace('/pay'); }
    else if (top !== 'locked') router.replace('/locked');
  }, [ready, authed, gate, seg]);

  if (!ready) return <Screen><T>Loading…</T></Screen>;
  return (
    <QueryClientProvider client={qc}>
      <StatusBar style="auto" />
      <AppLock><Stack screenOptions={{ headerShown: false, headerShadowVisible: false, headerTintColor: c.text, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { fontWeight: '800', fontSize: 18 }, contentStyle: { backgroundColor: c.bg } }} /></AppLock>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(Root);
