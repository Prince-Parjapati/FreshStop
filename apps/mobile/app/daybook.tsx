import { useCallback, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { today, useRepo } from '../src/lib/useRepo';
import { sharePdf } from '../src/lib/share';
import { slipHtml, waLink } from '../src/lib/slip';
import { publicSettings } from '../src/lib/shop';
import { Banner, Button, Card, Screen, T } from '../src/ui/kit';
import { Linking } from 'react-native';
import { useT } from '../src/i18n';

const RANGES = [['Today', 0], ['Week', 6], ['Month', 29]] as const;
export default function DayBook() {
  const repo = useRepo(); const t = useT();
  const [days, setDays] = useState(0); const [rows, setRows] = useState<any[]>([]); const [sel, setSel] = useState<Set<string>>(new Set()); const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    if (!repo) return; const d = new Date(); d.setDate(d.getDate() - days);
    setRows(await repo.transactions({ from: d.toISOString().slice(0, 10), to: today(), limit: 200 }));
  }, [repo, days]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const slip = async (r: any, wa = false) => {
    const co = await repo!.company(); const s = await publicSettings(); const items = await repo!.billItems(r.id);
    const html = slipHtml({ shop: { name: co?.name, address: co?.address, phone: co?.phone, upi: s.upi_id }, txn: r, items, party: r.party_name ?? '', prevBalance: r.prev_balance_paise });
    if (wa) Linking.openURL(waLink(r.party_phone, `${r.voucher_no} ${r.party_name}: ${formatINR(r.total_paise)}`)); else await sharePdf(html, r.voucher_no);
  };
  const del = async () => { for (const id of sel) await repo!.softDelete(id); setSel(new Set()); setMsg(`${sel.size} moved to Recycle Bin (kept 30 days)`); load(); };
  return (
    <Screen style={{ paddingTop: 40 }}>
      <Stack.Screen options={{ headerShown: true, title: t('daybook') }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>{RANGES.map(([l, d]) => <View key={l} style={{ flex: 1 }}><Button kind={days === d ? 'primary' : 'ghost'} label={l} onPress={() => setDays(d)} /></View>)}</View>
      {!!msg && <Banner text={msg} />}
      {sel.size > 0 && <Button kind="danger" label={`${t('delete')} (${sel.size})`} onPress={del} />}
      <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} initialNumToRender={20} windowSize={7}
        ListEmptyComponent={<T muted>No entries.</T>}
        renderItem={({ item: r }) => (
          <Pressable onLongPress={() => setSel(new Set(sel).add(r.id))} onPress={() => sel.size && setSel((p) => { const n = new Set(p); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}>
            <Card style={{ borderColor: sel.has(r.id) ? '#16A34A' : undefined, borderWidth: sel.has(r.id) ? 2 : 1, gap: 4 }}>
              <T bold>{r.voucher_no} · {r.type}</T><T muted>{r.date} · {r.party_name ?? r.narration ?? ''}</T><T size="lg" bold>{formatINR(r.total_paise)}</T>
              <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button kind="ghost" label={t('share')} onPress={() => slip(r)} /></View><View style={{ flex: 1 }}><Button kind="ghost" label="WhatsApp" onPress={() => slip(r, true)} /></View></View>
            </Card></Pressable>)} />
    </Screen>
  );
}
