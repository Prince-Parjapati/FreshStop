import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { today, useRepo } from '../src/lib/useRepo';
import { Card, Empty, Row, Screen, T } from '../src/ui/kit';
import { DatePicker, fmtDMY } from '../src/ui/DatePicker';
import { useTheme } from '../src/ui/theme';
import { useT } from '../src/i18n';

const META: Record<string, [any, string]> = { SALE: ['cart', '#0F8A4F'], PURCHASE: ['basket', '#7C3AED'], RECEIPT: ['arrow-down-circle', '#0284C7'], PAYMENT: ['arrow-up-circle', '#F59E0B'], EXPENSE: ['wallet', '#D92D20'] };
export default function DayBook() {
  const repo = useRepo(); const t = useT(); const router = useRouter(); const { c } = useTheme(); const [date, setDate] = useState(today()); const [d, setD] = useState<any>(null);
  useFocusEffect(useCallback(() => { repo?.dayBook(date).then(setD); }, [repo, date]));
  const ok = d && d.difference === 0;
  return (
    <Screen><Stack.Screen options={{ headerShown: true, title: t('daybook') }} />
      <DatePicker label="Date" value={date} onChange={setDate} />
      {d && <><Card style={{ marginVertical: 12, backgroundColor: c.hero, gap: 10 }}>
        <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><T size="xs" color="#FFFFFFB3">Total Debit</T><T size="lg" bold color="#fff">{formatINR(d.totalDebit)}</T></View><View style={{ flex: 1 }}><T size="xs" color="#FFFFFFB3">Total Credit</T><T size="lg" bold color="#fff">{formatINR(d.totalCredit)}</T></View></View>
        <T size="sm" bold color={ok ? '#86EFAC' : '#FCA5A5'}>{ok ? '✓ Books balanced' : `✗ Difference ${formatINR(Math.abs(d.difference))}`}</T></Card>
        <FlatList data={d.rows} keyExtractor={(r: any) => r.id} contentContainerStyle={{ gap: 10, paddingBottom: 40 }} ListEmptyComponent={<Empty text={`No entries for ${fmtDMY(date)}.`} />}
          renderItem={({ item: r }: any) => <Row icon={(META[r.type] ?? META.SALE!)[0]} tint={(META[r.type] ?? META.SALE!)[1]} title={r.party_name ?? r.narration ?? r.type} sub={`${r.voucher_no} · ${r.type}${r.mode ? ' · ' + r.mode : ''}`} onPress={() => r.type !== 'EXPENSE' && router.push({ pathname: '/txn/[id]', params: { id: r.id } } as any)} right={<T bold>{formatINR(r.total_paise)}</T>} />} /></>}
    </Screen>
  );
}
