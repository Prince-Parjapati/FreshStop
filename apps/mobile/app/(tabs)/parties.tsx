import { useCallback, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRepo } from '../../src/lib/useRepo';
import { Amount, Button, Row, Screen, Segmented, T } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

export default function Parties() {
  const repo = useRepo(); const router = useRouter(); const { c, radius } = useTheme();
  const [list, setList] = useState<any[]>([]); const [q, setQ] = useState(''); const [tab, setTab] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const load = useCallback(async (s = q) => { if (repo) setList(await repo.listAccounts({ type: tab === 'ALL' ? undefined : tab, search: s })); }, [repo, tab, q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <Screen top>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><T size="xxl" bold>Parties</T><View style={{ width: 130 }}><Button icon="person-add" label="Add" onPress={() => router.push({ pathname: '/party-form', params: { type: tab === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER' } } as any)} /></View></View>
      <Segmented value={tab} onChange={setTab} options={[{ key: 'ALL', label: 'All' }, { key: 'CUSTOMER', label: 'Customers' }, { key: 'SUPPLIER', label: 'Suppliers' }]} />
      <View style={{ marginVertical: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1.5, borderColor: c.border }}>
        <Ionicons name="search" size={20} color={c.muted} /><TextInput accessibilityLabel="Search parties" placeholder="Search name or phone" placeholderTextColor={c.muted} value={q} onChangeText={(v) => { setQ(v); load(v); }} style={{ flex: 1, minHeight: 48, color: c.text, fontSize: 16, paddingHorizontal: 8 }} />
      </View>
      <FlatList data={list} keyExtractor={(p) => p.id} initialNumToRender={20} windowSize={7} contentContainerStyle={{ gap: 10, paddingBottom: 110 }} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={{ alignItems: 'center', padding: 32, gap: 8 }}><Ionicons name="people-outline" size={44} color={c.muted} /><T muted>No parties yet. Tap Add to create one.</T></View>}
        renderItem={({ item }) => <Row icon={item.type === 'CUSTOMER' ? 'person' : 'leaf'} tint={item.type === 'CUSTOMER' ? c.primary : c.purple}
          title={item.name} sub={[item.name_hi, item.type === 'CUSTOMER' ? 'Customer' : 'Supplier', item.phone, item.city].filter(Boolean).join(' · ')}
          onPress={() => router.push(`/ledger/${item.id}` as any)} onLongPress={() => router.push({ pathname: '/party-form', params: { id: item.id } } as any)} right={<Amount paise={item.balance} bold />} />} />
    </Screen>
  );
}
