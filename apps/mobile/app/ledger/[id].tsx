import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Amount, Button, Card, Screen, T } from '../../src/ui/kit';
import { today, useRepo } from '../../src/lib/useRepo';
import { sharePdf } from '../../src/lib/share';
import { statementHtml } from '../../src/lib/slip';

const R = [['Month', 29], ['3 Mo', 89], ['FY', 365]] as const;
export default function Ledger() {
  const { id } = useLocalSearchParams<{ id: string }>(); const repo = useRepo();
  const [days, setDays] = useState(29); const [led, setLed] = useState<any>(null); const [name, setName] = useState('');
  const from = () => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); };
  useEffect(() => { if (!repo) return; (repo as any).db.all('SELECT name FROM accounts WHERE id=?', [id]).then((r: any[]) => setName(r[0]?.name ?? '')); repo.ledger(id, from(), today()).then(setLed); }, [repo, id, days]);
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: name }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>{R.map(([l, d]) => <View key={l} style={{ flex: 1 }}><Button kind={days === d ? 'primary' : 'ghost'} label={l} onPress={() => setDays(d)} /></View>)}</View>
      {led && <><Card><T muted>Opening</T><Amount paise={led.opening} /><T muted>Closing</T><Amount paise={led.closing} size="xl" bold /></Card>
        <FlatList data={led.rows} keyExtractor={(r: any, i) => r.id + i} contentContainerStyle={{ gap: 6, paddingVertical: 8 }} initialNumToRender={25} windowSize={7}
          renderItem={({ item: r }: any) => <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View><T bold>{r.voucher_no}</T><T size="xs" muted>{r.date}</T></View><View style={{ alignItems: 'flex-end' }}><T>{r.dr ? `Dr ${r.dr / 100}` : `Cr ${r.cr / 100}`}</T><Amount paise={r.balance} size="sm" /></View></Card>} />
        <Button label="Share statement (PDF)" onPress={async () => sharePdf(statementHtml((await repo!.company())?.name ?? 'Mandi Khata', name, from(), today(), led), 'statement-' + name)} /></>}
    </Screen>
  );
}
