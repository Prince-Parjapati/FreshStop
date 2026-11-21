import { useCallback, useState } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatINR } from '@mandimart/shared';
import { today, useRepo } from '../src/lib/useRepo';
import { Card, Empty, Screen, SearchBar, Segmented, T } from '../src/ui/kit';
import { reminderText, waLink } from '../src/lib/slip';
import { publicSettings } from '../src/lib/shop';
import { useSettings } from '../src/i18n';
import { useTheme } from '../src/ui/theme';

export default function Outstanding() {
  const repo = useRepo(); const router = useRouter(); const { lang } = useSettings(); const { c } = useTheme();
  const [kind, setKind] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER'); const [q, setQ] = useState(''); const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(async (s = q) => { if (repo) setRows(await repo.outstanding(today(), kind, s)); }, [repo, kind, q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const total = rows.reduce((s, r) => s + r.total, 0); const rec = kind === 'CUSTOMER';
  const remind = async (r: any) => { const co = await repo!.company(); const s = await publicSettings(); Linking.openURL(waLink(r.phone, reminderText(r.name, r.total, co?.name || 'Mandi Khata', s.upi_id, lang === 'hi'))); };
  const bar = (r: any) => { const parts = [[r.b0_30, '#0F8A4F'], [r.b31_60, '#F59E0B'], [r.b61_90, '#EA580C'], [r.b90p, '#D92D20']] as const; return <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: c.border }}>{parts.map(([v, col], i) => v > 0 ? <View key={i} style={{ flex: v, backgroundColor: col }} /> : null)}</View>; };
  return (
    <Screen><Stack.Screen options={{ headerShown: true, title: 'Outstanding' }} />
      <Segmented value={kind} onChange={setKind} options={[{ key: 'CUSTOMER', label: 'Receivable' }, { key: 'SUPPLIER', label: 'Payable' }]} />
      <View style={{ height: 12 }} /><SearchBar value={q} onChangeText={(v) => { setQ(v); load(v); }} placeholder="Search party" />
      <Card style={{ marginVertical: 12, backgroundColor: rec ? c.hero : '#7A1D14' }}><T size="xs" color="#FFFFFFB3">Total {rec ? 'receivable' : 'payable'}</T><T size="xxl" bold color="#fff">{formatINR(total)}</T><T size="xs" color="#FFFFFFB3">{rows.length} parties</T></Card>
      <FlatList data={rows} keyExtractor={(r) => r.partyId} contentContainerStyle={{ gap: 10, paddingBottom: 40 }} ListEmptyComponent={<Empty icon="checkmark-circle-outline" text="No outstanding dues found." />}
        renderItem={({ item: r }) => <Pressable onPress={() => router.push(`/ledger/${r.partyId}` as any)}><Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flex: 1 }}><T bold size="lg">{r.name}</T>{!!r.phone && <T size="xs" muted>{r.phone}</T>}</View><T bold size="lg" color={rec ? c.primary : c.danger}>{formatINR(r.total)}</T></View>
          {bar(r)}
          <Text style={{ color: c.muted, fontSize: 12 }}>0-30 {formatINR(r.b0_30, { decimals: false })}  ·  31-60 {formatINR(r.b31_60, { decimals: false })}  ·  61-90 {formatINR(r.b61_90, { decimals: false })}  ·  90+ {formatINR(r.b90p, { decimals: false })}</Text>
          {rec && <Pressable accessibilityRole="button" onPress={() => remind(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}><Ionicons name="logo-whatsapp" size={20} color="#25D366" /><Text style={{ color: '#128C7E', fontWeight: '700' }}>Send reminder</Text></Pressable>}
        </Card></Pressable>} />
    </Screen>
  );
}
