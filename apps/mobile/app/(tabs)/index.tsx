import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { useApp } from '../../src/lib/store';
import { today, useRepo } from '../../src/lib/useRepo';
import { Banner, Card, Screen, T } from '../../src/ui/kit';

export default function Home() {
  const repo = useRepo(); const gate = useApp((s) => s.gate);
  const [d, setD] = useState<any>(null); const [rows, setRows] = useState<any[]>([]); const [ref, setRef] = useState(false);
  const load = useCallback(async () => { if (!repo) return; setRef(true); setD(await repo.dashboard(today())); setRows(await repo.outstanding(today())); setRef(false); }, [repo]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const tile = (l: string, v: number, tone?: string) => <Card style={{ flex: 1, minWidth: '45%' }}><T size="sm" muted>{l}</T><T size="lg" bold color={tone}>{formatINR(v, { decimals: false })}</T></Card>;
  return (
    <Screen><ScrollView refreshControl={<RefreshControl refreshing={ref} onRefresh={load} />} contentContainerStyle={{ gap: 12, paddingTop: 32 }}>
      <T size="xl" bold>Today</T>
      {gate?.kind === 'WARN' && <Banner text={`Connect to internet within ${(gate as any).daysLeft} days to keep the app active.`} />}
      {d && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {tile('Sales', d.todaySales)}{tile('Receipts', d.todayReceipts, '#16A34A')}{tile('Payments', d.todayPayments, '#DC2626')}{tile('Cash + Bank', d.cashBalance)}
        {tile('Receivable', d.receivables, '#16A34A')}{tile('Payable', d.payables, '#DC2626')}</View>}
      <T size="lg" bold>Outstanding (aging)</T>
      {!rows.length && <T muted>No dues. 🎉</T>}
      {rows.slice(0, 10).map((r) => <Card key={r.partyId}><T bold>{r.name}</T><T>{formatINR(r.total, { decimals: false })}  ·  0-30: {r.b0_30 / 100 | 0}  31-60: {r.b31_60 / 100 | 0}  61-90: {r.b61_90 / 100 | 0}  90+: {r.b90p / 100 | 0}</T></Card>)}
    </ScrollView></Screen>
  );
}
