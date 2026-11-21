import { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { Button, Card, Chip, ChipRow, Empty, Screen, T } from '../../src/ui/kit';
import { DatePicker, fmtDMY } from '../../src/ui/DatePicker';
import { today, useRepo } from '../../src/lib/useRepo';
import { sharePdf } from '../../src/lib/share';
import { reminderText, statementHtml, waLink } from '../../src/lib/slip';
import { publicSettings } from '../../src/lib/shop';
import { useSettings } from '../../src/i18n';
import { useTheme } from '../../src/ui/theme';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const ago = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const R = [['Today', 'today'], ['Week', 'week'], ['Month', 'month'], ['FY', 'fy'], ['Custom', 'custom']] as const;
export default function Ledger() {
  const { id } = useLocalSearchParams<{ id: string }>(); const repo = useRepo(); const router = useRouter(); const { lang } = useSettings(); const { c } = useTheme();
  const [rg, setRg] = useState<(typeof R)[number][1]>('month'); const [cf, setCf] = useState(ago(29)); const [ct, setCt] = useState(today());
  const [led, setLed] = useState<any>(null); const [acc, setAcc] = useState<any>(null); const [sel, setSel] = useState<Set<string>>(new Set());
  const range = () => { const t = today(); if (rg === 'today') return [t, t]; if (rg === 'week') return [ago(6), t]; if (rg === 'month') return [ago(29), t]; if (rg === 'fy') { const n = new Date(); const y = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1; return [`${y}-04-01`, t]; } return [cf, ct]; };
  const [from, to] = range();
  const load = useCallback(async () => { if (!repo) return; setAcc(await repo.getAccount(id)); setLed(await repo.ledger(id, from, to)); setSel(new Set()); }, [repo, id, from, to]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const remind = async () => { const s = await publicSettings(); const co = await repo!.company(); const b = led.closing; Linking.openURL(waLink(acc.phone, reminderText(acc.name, b, co?.name || 'Mandi Khata', s.upi_id, lang === 'hi'))); };
  const delSel = () => Alert.alert(`Delete ${sel.size} entries?`, 'They move to the Recycle Bin for 30 days.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await repo!.softDeleteMany([...sel]); load(); } }]);
  const toggle = (k: string) => setSel((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const over = acc?.credit_limit_paise && led && led.closing > acc.credit_limit_paise;
  return (
    <Screen style={{ paddingTop: 8 }}><Stack.Screen options={{ headerShown: true, title: acc?.name ?? 'Ledger', headerRight: () => acc ? <Pressable onPress={() => router.push({ pathname: '/party-form', params: { id } } as any)} style={{ padding: 8 }}><T color="#16A34A" bold>Edit</T></Pressable> : null }} />
      <ChipRow>{R.map(([l, k]) => <Chip key={k} label={l} on={rg === k} onPress={() => setRg(k)} />)}</ChipRow>
      {rg === 'custom' && <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}><View style={{ flex: 1 }}><DatePicker label="From" value={cf} onChange={setCf} /></View><View style={{ flex: 1 }}><DatePicker label="To" value={ct} onChange={setCt} /></View></View>}
      {led && <>
        <Card style={{ backgroundColor: c.hero, gap: 4, marginTop: 12 }}><T size="xs" color="#FFFFFFB3">Closing balance</T><T size="xxl" bold color="#fff">{formatINR(Math.abs(led.closing))} {led.closing > 0 ? 'Dr' : led.closing < 0 ? 'Cr' : ''}</T><T size="xs" color="#FFFFFFB3">Opening {formatINR(Math.abs(led.opening))} {led.opening >= 0 ? 'Dr' : 'Cr'} · {fmtDMY(from!)}</T>{!!over && <T size="sm" color="#FCA5A5">Credit limit {formatINR(acc.credit_limit_paise)} exceeded</T>}</Card>
        {sel.size > 0 && <Button kind="danger" label={`Delete (${sel.size})`} onPress={delSel} />}
        <FlatList data={led.rows} keyExtractor={(r: any, i) => r.id + i} contentContainerStyle={{ gap: 8, paddingVertical: 12 }} initialNumToRender={25} windowSize={7} ListEmptyComponent={<Empty text="No entries in this period." />}
          renderItem={({ item: r }: any) => (
            <Pressable onLongPress={() => toggle(r.id)} onPress={() => (sel.size ? toggle(r.id) : router.push({ pathname: '/txn/[id]', params: { id: r.id } } as any))}>
              <Card style={{ flexDirection: 'row', justifyContent: 'space-between', borderColor: sel.has(r.id) ? c.primary : 'transparent', borderWidth: 2, padding: 12 }}>
                <View style={{ flex: 1 }}><T bold>{r.voucher_no}</T><T size="xs" muted>{fmtDMY(r.date)} · {r.type}{r.narration ? ' · ' + r.narration : ''}</T></View>
                <View style={{ alignItems: 'flex-end' }}><T color={r.dr ? '#16A34A' : '#DC2626'}>{r.dr ? `Dr ${formatINR(r.dr)}` : `Cr ${formatINR(r.cr)}`}</T><T size="xs" muted>Bal {formatINR(Math.abs(r.balance))} {r.balance >= 0 ? 'Dr' : 'Cr'}</T></View></Card></Pressable>)} />
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button label="PDF statement" onPress={async () => sharePdf(statementHtml((await repo!.company())?.name ?? 'Mandi Khata', acc.name, from!, to!, led), 'statement-' + acc.name)} /></View>{led.closing > 0 && <View style={{ flex: 1 }}><Button kind="ghost" label="WhatsApp reminder" onPress={remind} /></View>}</View>
      </>}
    </Screen>
  );
}
