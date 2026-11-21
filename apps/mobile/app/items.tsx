import { useCallback, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { formatINR, toPaise } from '@mandimart/shared';
import { useRepo } from '../src/lib/useRepo';
import { Button, Card, Field, Screen, T } from '../src/ui/kit';
export default function Items() {
  const repo = useRepo(); const [list, setList] = useState<any[]>([]); const [n, setN] = useState(''); const [hi, setHi] = useState(''); const [rate, setRate] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(async () => { if (repo) setList(await repo.listItems()); }, [repo]); useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: 'Items' }} />
      <Card style={{ gap: 8 }}><Field label="Item name (English)" value={n} onChangeText={setN} error={err} /><Field label="हिंदी नाम (optional)" value={hi} onChangeText={setHi} /><Field label="Default rate ₹" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
        <Button label="Add item" onPress={async () => { if (n.trim().length < 2) return setErr('Enter a name'); if (list.some((x) => x.name.toLowerCase() === n.trim().toLowerCase())) return setErr('Already exists'); await repo!.addItem({ name: n, nameHi: hi || undefined, ratePaise: rate ? toPaise(rate) : 0 }); setN(''); setHi(''); setRate(''); setErr(''); load(); }} /></Card>
      <FlatList data={list} keyExtractor={(i) => i.id} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} renderItem={({ item }) => <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><T bold>{item.name}{item.name_hi ? ` · ${item.name_hi}` : ''}</T><T size="xs" muted>{item.unit} · {formatINR(item.default_rate_paise)}</T></View><Button kind="ghost" label="Delete" onPress={() => Alert.alert('Delete item?', item.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await repo!.deleteItem(item.id); load(); } }])} /></Card>} />
    </Screen>
  );
}
