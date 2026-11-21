import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { formatINR, paymentSubmitSchema } from '@mandimart/shared';
import { supabase } from '../src/lib/supabase';
import { checkLicence } from '../src/lib/licence';
import { useApp } from '../src/lib/store';
import { Banner, Button, Card, Field, Screen, T } from '../src/ui/kit';

export default function Pay() {
  const setGate = useApp((s) => s.setGate);
  const [st, setSt] = useState<{ profile?: any; plan?: any; settings: Record<string, any>; last?: any }>({ settings: {} });
  const [utr, setUtr] = useState(''); const [payer, setPayer] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const [p, pl, s, last] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.user!.id).single(),
      supabase.from('plans').select('*').eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('public_settings').select('*'),
      supabase.from('payment_requests').select('*').eq('user_id', u.user!.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setSt({ profile: p.data, plan: pl.data, settings: Object.fromEntries((s.data ?? []).map((r: any) => [r.key, r.value])), last: last.data });
    if (p.data?.status === 'ACTIVE') setGate(await checkLicence());
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const { profile, plan, settings, last } = st;
  const amount = plan?.price_paise ?? 0;
  const upi = `upi://pay?pa=${encodeURIComponent(settings.upi_id ?? '')}&pn=${encodeURIComponent(settings.upi_name ?? 'MandiMart')}&am=${(amount / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(profile?.user_code ?? '')}`;
  const waiting = last?.status === 'SUBMITTED';

  const submit = async () => {
    setErr('');
    const r = paymentSubmitSchema.safeParse({ utr, payerName: payer, method: 'UPI', amountPaise: amount });
    if (!r.success) return setErr(r.error.issues[0]!.message);
    setBusy(true);
    const { error } = await supabase.from('payment_requests').insert({ user_id: profile.id, plan_id: plan.id, amount_paise: amount, utr: r.data.utr.toUpperCase(), payer_name: r.data.payerName, method: 'UPI' });
    setBusy(false);
    if (error) setErr(error.code === '23505' ? 'This UTR is already used.' : error.message); else load();
  };
  return (
    <Screen><ScrollView contentContainerStyle={{ gap: 12, paddingTop: 40 }}>
      <T size="xl" bold>Activate MandiMart Pro</T>
      <Card>
        <T muted>Lifetime licence</T><T size="xxl" bold>{formatINR(amount, { decimals: false })}</T>
        <T muted>Your code: {profile?.user_code}</T>
      </Card>
      {last?.status === 'REJECTED' && <Banner tone="error" text={`Payment rejected: ${last.admin_note ?? ''}. Please resubmit.`} />}
      {waiting ? (
        <Card><T bold>Waiting for approval…</T><T muted>UTR {last.utr}. This page updates automatically.</T></Card>
      ) : (
        <>
          <Button label={`Pay ${formatINR(amount, { decimals: false })} via UPI`} onPress={() => Linking.openURL(upi)} disabled={!settings.upi_id} />
          <T muted>UPI ID: {settings.upi_id || '—'}</T>
          <Field label="UTR / Transaction ID" autoCapitalize="characters" value={utr} onChangeText={setUtr} />
          <Field label="Payer name" value={payer} onChangeText={setPayer} />
          {!!err && <Banner tone="error" text={err} />}
          <Button label="I have paid — submit" onPress={submit} loading={busy} />
        </>
      )}
      {!!settings.whatsapp && <Button kind="ghost" label="Contact admin on WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${settings.whatsapp}`)} />}
      <View><Button kind="ghost" label="Logout" onPress={() => supabase.auth.signOut()} /></View>
    </ScrollView></Screen>
  );
}
