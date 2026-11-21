import { useCallback, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { today, useRepo } from '../src/lib/useRepo';
import { Card, Screen, T } from '../src/ui/kit';
import { DatePicker, fmtDMY } from '../src/ui/DatePicker';
import { useT } from '../src/i18n';

const COLOR: Record<string, string> = { SALE: '#16A34A', RECEIPT: '#0EA5E9', PAYMENT: '#F59E0B', PURCHASE: '#8B5CF6', EXPENSE: '#DC2626' };
export default function DayBook() {
  const repo = useRepo(); const t = useT(); const router = useRouter(); const [date, setDate] = useState(today()); const [d, setD] = useState<any>(null);
  useFocusEffect(useCallback(() => { repo?.dayBook(date).then(setD); }, [repo, date]));
  return (
    <Screen style={{ paddingTop: 8 }}><Stack.Screen options={{ headerShown: true, title: t('daybook') }} />
      <DatePicker label="Date" value={date} onChange={setDate} />
      {d && <><Card style={{ marginVertical: 8, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T muted>Total Debit</T><T bold>{formatINR(d.totalDebit)}</T></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T muted>Total Credit</T><T bold>{formatINR(d.totalCredit)}</T></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T muted>Difference</T><T bold color={d.difference === 0 ? '#16A34A' : '#DC2626'}>{formatINR(Math.abs(d.difference))}{d.difference === 0 ? ' ✓' : ' ✗'}</T></View></Card>
        <FlatList data={d.rows} keyExtractor={(r: any) => r.id} contentContainerStyle={{ gap: 8, paddingBottom: 16 }} ListEmptyComponent={<T muted>No entries for {fmtDMY(date)}.</T>}
          renderItem={({ item: r }: any) => <Pressable accessibilityRole="button" onPress={() => r.type !== 'EXPENSE' && router.push({ pathname: '/txn/[id]', params: { id: r.id } } as any)}>
            <Card style={{ gap: 2, borderLeftWidth: 4, borderLeftColor: COLOR[r.type] ?? '#999' }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T bold>{r.party_name ?? r.narration ?? r.type}</T><T bold>{formatINR(r.total_paise)}</T></View><T size="xs" muted>{r.voucher_no} · {r.type}{r.mode ? ' · ' + r.mode : ''}</T></Card></Pressable>} /></>}
    </Screen>
  );
}
