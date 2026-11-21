import { useCallback, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { useRepo } from '../src/lib/useRepo';
import { Button, Card, Screen, T } from '../src/ui/kit';
import { useTheme } from '../src/ui/theme';
export default function Items() {
  const repo = useRepo(); const router = useRouter(); const { c, radius } = useTheme(); const [list, setList] = useState<any[]>([]); const [q, setQ] = useState('');
  const load = useCallback(async (s = q) => { if (repo) setList(await repo.listItems(s)); }, [repo, q]); useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <Screen style={{ paddingTop: 12 }}><Stack.Screen options={{ headerShown: true, title: 'Items' }} />
      <TextInput accessibilityLabel="Search" placeholder="Search items…" placeholderTextColor={c.muted} value={q} onChangeText={(v) => { setQ(v); load(v); }} style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 12, fontSize: 16, marginBottom: 8 }} />
      <Button label="+ Add item" onPress={() => router.push('/item-form' as any)} />
      <FlatList data={list} keyExtractor={(i) => i.id} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} ListEmptyComponent={<T muted>No items found.</T>}
        renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/item-form', params: { id: item.id } } as any)}><Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flex: 1 }}><T bold>{item.name}{item.name_hi ? ` · ${item.name_hi}` : ''}</T><T size="xs" muted>{item.unit}{item.category ? ' · ' + item.category : ''}{item.hsn_code ? ' · HSN ' + item.hsn_code : ''}</T></View><T bold>{item.default_rate_paise ? formatINR(item.default_rate_paise) : '—'}</T></Card></Pressable>} />
    </Screen>
  );
}
