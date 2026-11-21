import { useCallback, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useRepo } from '../../src/lib/useRepo';
import { Amount, Button, Card, Screen, T } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

export default function Parties() {
  const repo = useRepo(); const router = useRouter(); const { c, radius } = useTheme();
  const [list, setList] = useState<any[]>([]); const [q, setQ] = useState(''); const [tab, setTab] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const load = useCallback(async (s = q) => { if (repo) setList(await repo.listAccounts({ type: tab === 'ALL' ? undefined : tab, search: s })); }, [repo, tab, q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <Screen style={{ paddingTop: 40 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>{(['ALL', 'CUSTOMER', 'SUPPLIER'] as const).map((k) => <View key={k} style={{ flex: 1 }}><Button kind={tab === k ? 'primary' : 'ghost'} label={k === 'ALL' ? 'All' : k === 'CUSTOMER' ? 'Customers' : 'Suppliers'} onPress={() => setTab(k)} /></View>)}</View>
      <TextInput accessibilityLabel="Search" placeholder="Search by name or phone…" placeholderTextColor={c.muted} value={q} onChangeText={(v) => { setQ(v); load(v); }}
        style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 12, fontSize: 16, marginBottom: 8 }} />
      <Button label="+ Add party" onPress={() => router.push({ pathname: '/party-form', params: { type: tab === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER' } } as any)} />
      <FlatList data={list} keyExtractor={(p) => p.id} initialNumToRender={20} windowSize={7} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} ListEmptyComponent={<T muted>No parties found.</T>}
        renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push(`/ledger/${item.id}` as any)} onLongPress={() => router.push({ pathname: '/party-form', params: { id: item.id } } as any)}>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flex: 1 }}><T bold>{item.name}{item.name_hi ? ` · ${item.name_hi}` : ''}</T><T size="xs" muted>{item.type === 'CUSTOMER' ? 'Customer' : 'Supplier'}{item.phone ? ' · ' + item.phone : ''}{item.city ? ' · ' + item.city : ''}</T></View><Amount paise={item.balance} bold /></Card></Pressable>} />
      <T size="xs" muted>Tap = ledger · long-press = edit</T>
    </Screen>
  );
}
