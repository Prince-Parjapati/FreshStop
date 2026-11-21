import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { today, useRepo } from '../src/lib/useRepo';
import { Banner, Button, Card, Field, Screen, T } from '../src/ui/kit';
export default function Crates() {
  const repo = useRepo(); const [parties, setParties] = useState<any[]>([]); const [bal, setBal] = useState<any[]>([]); const [p, setP] = useState(''); const [given, setGiven] = useState(''); const [ret, setRet] = useState(''); const [msg, setMsg] = useState<{ t: string; e?: boolean } | null>(null);
  const load = useCallback(async () => { if (!repo) return; setBal(await repo.crateBalances()); setParties(await (repo as any).db.all("SELECT id,name FROM accounts WHERE type IN ('CUSTOMER','SUPPLIER') AND deleted_at IS NULL ORDER BY name")); }, [repo]); useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: 'Crates' }} /><ScrollView contentContainerStyle={{ gap: 10 }}>
      <Card style={{ gap: 8 }}><T bold>Crate given / returned</T>
        <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>{parties.map((x) => <Pressable key={x.id} onPress={() => setP(x.id)} style={{ minHeight: 44, justifyContent: 'center' }}><T bold={p === x.id} color={p === x.id ? '#16A34A' : undefined}>{p === x.id ? '✓ ' : ''}{x.name}</T></Pressable>)}</ScrollView>
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="Given" keyboardType="number-pad" value={given} onChangeText={setGiven} /></View><View style={{ flex: 1 }}><Field label="Returned" keyboardType="number-pad" value={ret} onChangeText={setRet} /></View></View>
        {msg && <Banner tone={msg.e ? 'error' : 'warn'} text={msg.t} />}
        <Button label="Save" onPress={async () => { try { if (!p) throw new Error('Select a party'); await repo!.crateMove({ partyId: p, date: today(), given: Number(given) || 0, returned: Number(ret) || 0 }); setGiven(''); setRet(''); setMsg({ t: 'Saved' }); load(); } catch (e: any) { setMsg({ t: e.message, e: true }); } }} /></Card>
      <T size="lg" bold>Crates with parties</T>{!bal.length && <T muted>No crates outstanding.</T>}
      {bal.map((b) => <Card key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T bold>{b.name}</T><T size="lg" bold color={b.held > 0 ? '#F59E0B' : undefined}>{b.held}</T></Card>)}
    </ScrollView></Screen>
  );
}
