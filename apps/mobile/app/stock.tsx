import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { today, useRepo } from '../src/lib/useRepo';
import { Banner, Button, Card, Field, Screen, T } from '../src/ui/kit';
export default function Stock() {
  const repo = useRepo(); const [rows, setRows] = useState<any[]>([]); const [item, setItem] = useState(''); const [qty, setQty] = useState(''); const [note, setNote] = useState(''); const [msg, setMsg] = useState<{ t: string; e?: boolean } | null>(null);
  const load = useCallback(async () => { if (repo) setRows(await repo.stock()); }, [repo]); useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: 'Stock & Wastage' }} /><ScrollView contentContainerStyle={{ gap: 10 }}>
      <Card style={{ gap: 8 }}><T bold>Record wastage / spoilage</T><Field label="Item" value={item} onChangeText={setItem} /><Field label="Qty lost (KG)" keyboardType="decimal-pad" value={qty} onChangeText={setQty} /><Field label="Note" value={note} onChangeText={setNote} />
        {msg && <Banner tone={msg.e ? 'error' : 'warn'} text={msg.t} />}
        <Button label="Save wastage" onPress={async () => { try { if (!item.trim()) throw new Error('Enter item'); await repo!.addWastage({ itemName: item, qty: Number(qty), date: today(), note }); setItem(''); setQty(''); setNote(''); setMsg({ t: 'Saved' }); load(); } catch (e: any) { setMsg({ t: e.message, e: true }); } }} /></Card>
      <T size="lg" bold>Current stock (bought − sold − wasted)</T>
      {!rows.length && <T muted>No stock movement yet.</T>}
      {rows.map((r) => <Card key={r.item_name + r.unit} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View><T bold>{r.item_name}</T><T size="xs" muted>In {r.bought} · Out {r.sold} · Waste {r.wasted}</T></View><T size="lg" bold color={r.stock < 0 ? '#DC2626' : undefined}>{r.stock} {r.unit}</T></Card>)}
    </ScrollView></Screen>
  );
}
