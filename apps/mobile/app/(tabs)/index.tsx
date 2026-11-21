import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { useApp } from '../../src/lib/store';
import { today, useRepo } from '../../src/lib/useRepo';
import { Linking, Pressable } from 'react-native';
import * as Application from 'expo-application';
import { supabase } from '../../src/lib/supabase';
import { publicSettings } from '../../src/lib/shop';
import { reminderText, waLink } from '../../src/lib/slip';
import { useSettings, useT } from '../../src/i18n';
import { Banner, Button, Card, Screen, T } from '../../src/ui/kit';

export default function Home() {
  const repo = useRepo(); const gate = useApp((s) => s.gate); const t = useT(); const { hide, lang } = useSettings(); const [ann, setAnn] = useState<any[]>([]); const [maint, setMaint] = useState(false); const [shop, setShop] = useState(''); const [upi, setUpi] = useState('');
  const [d, setD] = useState<any>(null); const [rows, setRows] = useState<any[]>([]); const [ref, setRef] = useState(false);
  const load = useCallback(async () => { if (!repo) return; setRef(true);
    try {
      const [c, co, st, an] = await Promise.all([repo.counts(), repo.company(), publicSettings(), supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3)]);
      setShop(co?.name ?? ''); setUpi(st.upi_id ?? ''); setAnn(an.data ?? []); setMaint(st.maintenance === true || st.maintenance === 'true');
      supabase.rpc('heartbeat', { p_version: Application.nativeApplicationVersion ?? '1', p_vouchers: c.vouchers, p_parties: c.parties, p_items: c.items }).then(() => {}, () => {});
    } catch {} setD(await repo.dashboard(today())); setRows(await repo.outstanding(today())); setRef(false); }, [repo]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const tile = (l: string, v: number, tone?: string) => <Card style={{ flex: 1, minWidth: '45%' }}><T size="sm" muted>{l}</T><T size="lg" bold color={tone}>{hide ? '₹ ••••' : formatINR(v, { decimals: false })}</T></Card>;
  return (
    <Screen><ScrollView refreshControl={<RefreshControl refreshing={ref} onRefresh={load} />} contentContainerStyle={{ gap: 12, paddingTop: 32 }}>
      <T size="xl" bold>{t('today')}</T>{maint && <Banner tone="error" text="Server maintenance in progress. App works offline." />}{ann.map((a) => <Banner key={a.id} text={`${a.title}: ${a.body}`} />)}
      {gate?.kind === 'WARN' && <Banner text={`Connect to internet within ${(gate as any).daysLeft} days to keep the app active.`} />}
      {d && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {tile(t('sales'), d.todaySales)}{tile(t('receipts'), d.todayReceipts, '#16A34A')}{tile(t('payments'), d.todayPayments, '#DC2626')}{tile(t('cashbank'), d.cashBalance)}
        {tile(t('receivable'), d.receivables, '#16A34A')}{tile(t('payable'), d.payables, '#DC2626')}</View>}
      <T size="lg" bold>{t('outstanding')}</T>
      {!rows.length && <T muted>No dues. 🎉</T>}
      {rows.slice(0, 10).map((r) => <Card key={r.partyId} style={{ gap: 6 }}><T bold>{r.name}</T><T>{formatINR(r.total, { decimals: false })}  ·  0-30: {r.b0_30 / 100 | 0}  31-60: {r.b31_60 / 100 | 0}  61-90: {r.b61_90 / 100 | 0}  90+: {r.b90p / 100 | 0}</T><Button kind="ghost" label="WhatsApp reminder" onPress={() => Linking.openURL(waLink(r.phone, reminderText(r.name, r.total, shop || 'Mandi Khata', upi, lang === 'hi')))} /></Card>)}
    </ScrollView></Screen>
  );
}
