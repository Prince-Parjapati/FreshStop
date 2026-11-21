import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { today, useRepo } from '../../src/lib/useRepo';
import { shareText, toCsv } from '../../src/lib/share';
import { Button, Card, Screen, T } from '../../src/ui/kit';
import { useT } from '../../src/i18n';

export default function Reports() {
  const repo = useRepo(); const t = useT(); const [days, setDays] = useState(29);
  const [pl, setPl] = useState<any>(null); const [tb, setTb] = useState<any>(null); const [items, setItems] = useState<any[]>([]);
  const from = () => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); };
  useEffect(() => { if (!repo) return; repo.profitLoss(from(), today()).then(setPl); repo.trialBalance(today()).then(setTb); repo.itemWiseSales(from(), today()).then(setItems); }, [repo, days]);
  const row = (l: string, v: number, b?: boolean) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T bold={b}>{l}</T><T bold={b}>{formatINR(v)}</T></View>;
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: t('reports') }} />
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>{([['Month', 29], ['3 Mo', 89], ['Year', 364]] as const).map(([l, d]) => <View key={l} style={{ flex: 1 }}><Button kind={days === d ? 'primary' : 'ghost'} label={l} onPress={() => setDays(d)} /></View>)}</View>
        {pl && <Card style={{ gap: 4 }}><T size="lg" bold>Profit & Loss</T>{row('Sales', pl.sales)}{row('Purchases', -pl.purchases)}{row('Commission', pl.commission)}{row('Delivery recovered', pl.delivery)}{row('Expenses (Kharcha)', -pl.expenses)}{row('Net profit', pl.net, true)}</Card>}
        <Card style={{ gap: 4 }}><T size="lg" bold>Item-wise sales</T>{items.map((i) => <View key={i.item_name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T>{i.item_name} ({i.qty})</T><T>{formatINR(i.gross)}</T></View>)}
          <Button kind="ghost" label="Export CSV" onPress={() => shareText('item-sales.csv', toCsv(items.map((i) => ({ item: i.item_name, qty: i.qty, amount: i.gross / 100 }))))} /></Card>
        {tb && <Card style={{ gap: 4 }}><T size="lg" bold>Trial balance</T>{tb.rows.map((r: any) => <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T>{r.name}</T><T>{r.dr ? 'Dr ' + formatINR(r.dr) : 'Cr ' + formatINR(r.cr)}</T></View>)}{row('Total Dr', tb.totalDr, true)}{row('Total Cr', tb.totalCr, true)}
          <Button kind="ghost" label="Export CSV" onPress={() => shareText('trial-balance.csv', toCsv(tb.rows.map((r: any) => ({ account: r.name, dr: r.dr / 100, cr: r.cr / 100 }))))} /></Card>}
      </ScrollView></Screen>
  );
}
