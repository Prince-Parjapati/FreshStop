import { useCallback, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { formatINR } from '@mandimart/shared';
import { useApp } from '../../src/lib/store';
import { today, useRepo } from '../../src/lib/useRepo';
import { supabase } from '../../src/lib/supabase';
import { publicSettings } from '../../src/lib/shop';
import { reminderText, waLink } from '../../src/lib/slip';
import { useSettings, useT } from '../../src/i18n';
import { useTheme } from '../../src/ui/theme';
import { Banner, Card, IconBadge, Row, Section, T } from '../../src/ui/kit';

type I = keyof typeof Ionicons.glyphMap;
export default function Home() {
  const router = useRouter(); const repo = useRepo(); const gate = useApp((s) => s.gate); const t = useT(); const { hide, lang } = useSettings(); const { c } = useTheme(); const ins = useSafeAreaInsets();
  const [ann, setAnn] = useState<any[]>([]); const [maint, setMaint] = useState(false); const [shop, setShop] = useState(''); const [upi, setUpi] = useState('');
  const [d, setD] = useState<any>(null); const [rows, setRows] = useState<any[]>([]); const [ref, setRef] = useState(false);
  const load = useCallback(async () => { if (!repo) return; setRef(true);
    try {
      const [cn, co, st, an] = await Promise.all([repo.counts(), repo.company(), publicSettings(), supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3)]);
      setShop(co?.name ?? ''); setUpi(st.upi_id ?? ''); setAnn(an.data ?? []); setMaint(st.maintenance === true || st.maintenance === 'true');
      supabase.rpc('heartbeat', { p_version: Application.nativeApplicationVersion ?? '1', p_vouchers: cn.vouchers, p_parties: cn.parties, p_items: cn.items }).then(() => {}, () => {});
    } catch {} setD(await repo.dashboard(today())); setRows(await repo.outstanding(today())); setRef(false); }, [repo]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const money = (v: number, dec = false) => (hide ? '₹ ••••' : formatINR(v, { decimals: dec }));
  const go = (to: string, params?: object) => () => router.push((params ? { pathname: to, params } : to) as any);
  const tile = (icon: I, tint: string, label: string, to: string, params?: object) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={go(to, params)} style={({ pressed }) => ({ width: '23%', alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}>
      <IconBadge name={icon} color={tint} size={54} /><Text numberOfLines={1} style={{ color: c.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView refreshControl={<RefreshControl refreshing={ref} onRefresh={load} />} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ backgroundColor: c.hero, paddingTop: ins.top + 20, paddingHorizontal: 20, paddingBottom: 64, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -40, top: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: '#FFFFFF10' }} />
          <View style={{ position: 'absolute', left: -50, bottom: -60, width: 160, height: 160, borderRadius: 80, backgroundColor: '#FFFFFF0C' }} />
          <Text style={{ color: '#FFFFFFB3', fontSize: 13, fontWeight: '600' }}>{t('today')}</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 }}>{shop || 'Mandi Khata'}</Text>
          <Text style={{ color: '#FFFFFFB3', fontSize: 13, marginTop: 18 }}>{t('receivable')}</Text>
          <Text accessibilityLabel={`${t('receivable')} ${d ? money(d.receivables) : ''}`} style={{ color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -0.5 }}>{d ? money(d.receivables) : '—'}</Text>
        </View>
        {/* Summary card overlapping hero */}
        <View style={{ paddingHorizontal: 16, marginTop: -44, gap: 16 }}>
          {maint && <Banner tone="error" text="Server maintenance in progress. App works offline." />}
          {ann.map((a) => <Banner key={a.id} text={`${a.title}: ${a.body}`} />)}
          {gate?.kind === 'WARN' && <Banner text={`Connect to internet within ${(gate as any).daysLeft} days to keep the app active.`} />}
          <Card style={{ flexDirection: 'row', paddingVertical: 18 }}>
            {[[t('payable'), d?.payables, c.danger, '/outstanding'], [t('cashbank'), d?.cashBalance, c.text, undefined], [t('sales'), d?.todaySales, c.primary, '/list/sales']].map(([l, v, col, to], i) => (
              <Pressable key={i} disabled={!to} onPress={go(to as string)} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: c.border }}>
                <Text style={{ color: c.muted, fontSize: 12, fontWeight: '600' }}>{l as string}</Text>
                <Text style={{ color: col as string, fontSize: 18, fontWeight: '800', marginTop: 4 }}>{d ? money(v as number) : '—'}</Text>
              </Pressable>))}
          </Card>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 }}>
            <Pressable onPress={go('/list/receipts')} style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' }}><IconBadge name="arrow-down-circle" color={c.primary} size={40} /><View><T size="xs" muted>{t('receipts')}</T><T bold>{d ? money(d.todayReceipts) : '—'}</T></View></Pressable>
            <Pressable onPress={go('/list/payments')} style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' }}><IconBadge name="arrow-up-circle" color={c.danger} size={40} /><View><T size="xs" muted>{t('payments')}</T><T bold>{d ? money(d.todayPayments) : '—'}</T></View></Pressable>
          </Card>

          <Section title="Quick actions" />
          <Card style={{ gap: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {tile('cart', c.primary, 'Sale', '/(tabs)/entry', { kind: 'SALE' })}{tile('basket', c.purple, 'Purchase', '/(tabs)/entry', { kind: 'PURCHASE' })}{tile('arrow-down-circle', c.sky, 'Receipt', '/(tabs)/entry', { kind: 'RECEIPT' })}{tile('arrow-up-circle', c.accent, 'Payment', '/(tabs)/entry', { kind: 'PAYMENT' })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {tile('book', c.primary, 'Day Book', '/daybook')}{tile('time', c.danger, 'Outstanding', '/outstanding')}{tile('leaf', c.purple, 'Items', '/items')}{tile('stats-chart', c.sky, 'Reports', '/reports')}
            </View>
          </Card>

          <Section title={t('outstanding')} action="See all" onAction={go('/outstanding')} />
          {!rows.length && <Card style={{ alignItems: 'center', gap: 6 }}><Ionicons name="checkmark-circle" size={36} color={c.primary} /><T bold>No dues pending</T><T size="sm" muted>All customers are settled.</T></Card>}
          {rows.slice(0, 5).map((r) => (
            <Row key={r.partyId} icon="person" tint={c.danger} title={r.name} sub={r.b90p > 0 ? `${formatINR(r.b90p, { decimals: false })} older than 90 days` : r.oldest ? `Since ${r.oldest.slice(8, 10)}/${r.oldest.slice(5, 7)}` : 'Opening balance'}
              onPress={go(`/ledger/${r.partyId}`)} right={<View style={{ alignItems: 'flex-end', gap: 4 }}><T bold>{money(r.total)}</T>
                <Pressable accessibilityLabel={`WhatsApp reminder to ${r.name}`} hitSlop={10} onPress={() => Linking.openURL(waLink(r.phone, reminderText(r.name, r.total, shop || 'Mandi Khata', upi, lang === 'hi')))}><Ionicons name="logo-whatsapp" size={22} color="#25D366" /></Pressable></View>} />))}
        </View>
      </ScrollView>
    </View>
  );
}
