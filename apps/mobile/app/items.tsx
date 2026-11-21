import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { useRepo } from '../src/lib/useRepo';
import { Button, Empty, Row, Screen, SearchBar, T } from '../src/ui/kit';
import { useTheme } from '../src/ui/theme';
export default function Items() {
  const repo = useRepo(); const router = useRouter(); const { c } = useTheme(); const [list, setList] = useState<any[]>([]); const [q, setQ] = useState('');
  const load = useCallback(async (s = q) => { if (repo) setList(await repo.listItems(s)); }, [repo, q]); useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <Screen><Stack.Screen options={{ headerShown: true, title: 'Items' }} />
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}><View style={{ flex: 1 }}><SearchBar value={q} onChangeText={(v) => { setQ(v); load(v); }} placeholder="Search items" /></View><View style={{ width: 96 }}><Button icon="add" label="Add" onPress={() => router.push('/item-form' as any)} /></View></View>
      <FlatList data={list} keyExtractor={(i) => i.id} contentContainerStyle={{ gap: 10, paddingBottom: 40 }} ListEmptyComponent={<Empty icon="leaf-outline" text="No items yet. Add your first item." />}
        renderItem={({ item }) => <Row icon="leaf" tint={c.primary} title={item.name_hi ? `${item.name} · ${item.name_hi}` : item.name} sub={`${item.unit}${item.category ? ' · ' + item.category : ''}${item.hsn_code ? ' · HSN ' + item.hsn_code : ''}`} onPress={() => router.push({ pathname: '/item-form', params: { id: item.id } } as any)} right={<T bold>{item.default_rate_paise ? formatINR(item.default_rate_paise) : '—'}</T>} />} />
    </Screen>
  );
}
