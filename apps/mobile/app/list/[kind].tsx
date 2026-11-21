import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { useRepo } from '../../src/lib/useRepo';
import { Button, Card, Empty, Row, Screen, SearchBar, T } from '../../src/ui/kit';
import { fmtDMY } from '../../src/ui/DatePicker';
import { useTheme } from '../../src/ui/theme';

const META: Record<string, { title: string; type: string; add: string; icon: any; tint: string }> = {
  sales: { title: 'Sales / बिक्री', type: 'SALE', add: 'New Sale', icon: 'cart', tint: '#0F8A4F' },
  purchases: { title: 'Purchases / खरीद', type: 'PURCHASE', add: 'New Purchase', icon: 'basket', tint: '#7C3AED' },
  receipts: { title: 'Receipts / जमा', type: 'RECEIPT', add: 'New Receipt', icon: 'arrow-down-circle', tint: '#0284C7' },
  payments: { title: 'Payments / भुगतान', type: 'PAYMENT', add: 'New Payment', icon: 'arrow-up-circle', tint: '#F59E0B' },
};
const PAGE = 30;
export default function TxnList() {
  const { kind } = useLocalSearchParams<{ kind: string }>(); const m = META[kind ?? 'sales'] ?? META.sales!; const repo = useRepo(); const router = useRouter(); const { c } = useTheme();
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
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: m.title }} />
      <SearchBar value={q} onChangeText={(v) => { setQ(v); load(true, v); }} placeholder="Search party or voucher no." />
      <Card style={{ marginVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.hero }}>
        <View><T size="xs" color="#FFFFFFB3">{rows.length}{more ? '+' : ''} entries</T><T size="xl" bold color="#fff">{formatINR(total, { decimals: false })}</T></View>
        <View style={{ width: 150 }}>{sel.size > 0 ? <Button kind="danger" icon="trash" label={`Delete (${sel.size})`} onPress={del} /> : <Button icon="add" label={m.add} onPress={() => router.push({ pathname: '/(tabs)/entry', params: { kind: m.type } } as any)} />}</View>
      </Card>
      <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ gap: 10, paddingBottom: 40 }} initialNumToRender={15} windowSize={7} onEndReachedThreshold={0.4} onEndReached={() => more && load(false)}
        ListEmptyComponent={<Empty text="No entries found." />}
        renderItem={({ item: r }) => <Row icon={m.icon} tint={m.tint} title={r.party_name ?? '—'} sub={`${fmtDMY(r.date)} · ${r.voucher_no}${r.mode && r.type !== 'SALE' && r.type !== 'PURCHASE' ? ' · ' + r.mode : ''}`} selected={sel.has(r.id)}
          onLongPress={() => toggle(r.id)} onPress={() => (sel.size ? toggle(r.id) : router.push({ pathname: '/txn/[id]', params: { id: r.id } } as any))} right={<T bold>{formatINR(r.total_paise)}</T>} />} />
    </Screen>
  );
}
