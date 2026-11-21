import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { useRepo } from '../../src/lib/useRepo';
import { Button, Card, Screen, T } from '../../src/ui/kit';
import { fmtDMY } from '../../src/ui/DatePicker';
import { useTheme } from '../../src/ui/theme';

const META: Record<string, { title: string; type: string; hint: string; add: string }> = {
  sales: { title: 'Sales / बिक्री', type: 'SALE', hint: 'Tap to view / send slip', add: 'New Sale' },
  purchases: { title: 'Purchases / खरीद', type: 'PURCHASE', hint: 'Tap to view', add: 'New Purchase' },
  receipts: { title: 'Receipts / जमा', type: 'RECEIPT', hint: 'Tap to view deposit slip', add: 'New Receipt' },
  payments: { title: 'Payments / भुगतान', type: 'PAYMENT', hint: 'Tap to view', add: 'New Payment' },
};
const PAGE = 30;
export default function TxnList() {
  const { kind } = useLocalSearchParams<{ kind: string }>(); const m = META[kind ?? 'sales'] ?? META.sales!; const repo = useRepo(); const router = useRouter(); const { c, radius } = useTheme();
  const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState(''); const [more, setMore] = useState(true); const [sel, setSel] = useState<Set<string>>(new Set()); const loading = useRef(false);
  const load = useCallback(async (reset: boolean, query = q) => {
    if (!repo || loading.current) return; loading.current = true;
    try { const off = reset ? 0 : rows.length; const r = await repo.transactions({ type: m.type, search: query, limit: PAGE, offset: off }); setRows((p) => (reset ? r : [...p, ...r])); setMore(r.length === PAGE); } finally { loading.current = false; }
  }, [repo, q, rows.length, m.type]);
  useFocusEffect(useCallback(() => { setSel(new Set()); load(true); /* eslint-disable-next-line */ }, [repo, m.type]));
  const del = () => Alert.alert(`Delete ${sel.size} entr${sel.size === 1 ? 'y' : 'ies'}?`, 'They move to the Recycle Bin for 30 days.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await repo!.softDeleteMany([...sel]); setSel(new Set()); load(true); } }]);
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const total = rows.reduce((s, r) => s + r.total_paise, 0);
  return (
    <Screen style={{ paddingTop: 12 }}>
      <Stack.Screen options={{ headerShown: true, title: m.title }} />
      <TextInput accessibilityLabel="Search" placeholder="Search party or voucher no…" placeholderTextColor={c.muted} value={q} onChangeText={(v) => { setQ(v); load(true, v); }}
        style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 12, fontSize: 16, marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}><View style={{ flex: 1 }}><Button label={`+ ${m.add}`} onPress={() => router.push({ pathname: '/(tabs)/entry', params: { kind: m.type } } as any)} /></View>{sel.size > 0 && <View style={{ flex: 1 }}><Button kind="danger" label={`Delete (${sel.size})`} onPress={del} /></View>}</View>
      <T size="sm" muted>{rows.length}{more ? '+' : ''} entries · {formatINR(total)}{sel.size ? '' : ' · long-press to select'}</T>
      <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} initialNumToRender={15} windowSize={7} onEndReachedThreshold={0.4} onEndReached={() => more && load(false)}
        ListEmptyComponent={<T muted>No entries found.</T>}
        renderItem={({ item: r }) => (
          <Pressable accessibilityRole="button" onLongPress={() => toggle(r.id)} onPress={() => (sel.size ? toggle(r.id) : router.push({ pathname: '/txn/[id]', params: { id: r.id } } as any))}>
            <Card style={{ gap: 2, borderColor: sel.has(r.id) ? c.primary : c.border, borderWidth: sel.has(r.id) ? 2 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T bold>{r.party_name ?? '—'}</T><T bold>{formatINR(r.total_paise)}</T></View>
              <T size="sm" muted>{r.voucher_no} · {fmtDMY(r.date)}{r.mode && r.type !== 'SALE' && r.type !== 'PURCHASE' ? ' · ' + r.mode : ''}</T>
              {!sel.size && <T size="xs" muted>{m.hint}</T>}
            </Card></Pressable>)} />
    </Screen>
  );
}
