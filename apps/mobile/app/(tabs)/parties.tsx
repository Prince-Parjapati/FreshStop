import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { searchTerm, toPaise } from '@mandimart/shared';
import { useRepo } from '../../src/lib/useRepo';
import { Amount, Button, Card, Field, Screen, T } from '../../src/ui/kit';

export default function Parties() {
  const repo = useRepo();
  const [list, setList] = useState<any[]>([]); const [q, setQ] = useState('');
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [open, setOpen] = useState(''); const [type, setType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER'); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    if (!repo) return;
    const accs = await (repo as any).db.all("SELECT id,name,type,phone FROM accounts WHERE type IN ('CUSTOMER','SUPPLIER') AND deleted_at IS NULL ORDER BY name");
    setList(await Promise.all(accs.map(async (a: any) => ({ ...a, bal: await repo.balance(a.id) }))));
  }, [repo]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const add = async () => {
    const n = searchTerm(name); if (n.length < 2) return setErr('Enter a name');
    try { await repo!.addAccount({ name: n, type, phone: phone || undefined, openingPaise: open ? toPaise(open) : 0 }); setName(''); setPhone(''); setOpen(''); setErr(''); load(); } catch (e: any) { setErr(e.message); }
  };
  const s = searchTerm(q).toLowerCase();
  return (
    <Screen style={{ paddingTop: 40 }}>
      <Card style={{ gap: 8 }}>
        <Field label="Party name" value={name} onChangeText={setName} error={err} />
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="Mobile" keyboardType="number-pad" value={phone} onChangeText={setPhone} /></View><View style={{ flex: 1 }}><Field label="Opening ₹ (+Dr/−Cr)" keyboardType="numbers-and-punctuation" value={open} onChangeText={setOpen} /></View></View>
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button kind={type === 'CUSTOMER' ? 'primary' : 'ghost'} label="Customer" onPress={() => setType('CUSTOMER')} /></View><View style={{ flex: 1 }}><Button kind={type === 'SUPPLIER' ? 'primary' : 'ghost'} label="Supplier" onPress={() => setType('SUPPLIER')} /></View></View>
        <Button label="Add party" onPress={add} />
      </Card>
      <View style={{ height: 8 }} /><Field label="Search" value={q} onChangeText={setQ} />
      <FlatList data={list.filter((p) => !s || p.name.toLowerCase().includes(s))} keyExtractor={(p) => p.id} initialNumToRender={20} windowSize={7}
        contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
        renderItem={({ item }) => <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View><T bold>{item.name}</T><T size="xs" muted>{item.type}</T></View><Amount paise={item.bal} bold /></Card>} />
    </Screen>
  );
}
