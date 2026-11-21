import { useCallback, useState } from 'react';
import { FlatList, Linking, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { today, useRepo } from '../src/lib/useRepo';
import { Button, Card, Screen, T } from '../src/ui/kit';
import { reminderText, waLink } from '../src/lib/slip';
import { publicSettings } from '../src/lib/shop';
import { useSettings } from '../src/i18n';
import { useTheme } from '../src/ui/theme';

export default function Outstanding() {
  const repo = useRepo(); const router = useRouter(); const { lang } = useSettings(); const { c, radius } = useTheme();
  const [kind, setKind] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER'); const [q, setQ] = useState(''); const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(async (s = q) => { if (repo) setRows(await repo.outstanding(today(), kind, s)); }, [repo, kind, q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const total = rows.reduce((s, r) => s + r.total, 0);
  const remind = async (r: any) => { const co = await repo!.company(); const s = await publicSettings(); Linking.openURL(waLink(r.phone, reminderText(r.name, r.total, co?.name || 'Mandi Khata', s.upi_id, lang === 'hi'))); };
  return (
    <Screen style={{ paddingTop: 8 }}><Stack.Screen options={{ headerShown: true, title: 'Outstanding' }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}><View style={{ flex: 1 }}><Button kind={kind === 'CUSTOMER' ? 'primary' : 'ghost'} label="Receivable" onPress={() => setKind('CUSTOMER')} /></View><View style={{ flex: 1 }}><Button kind={kind === 'SUPPLIER' ? 'primary' : 'ghost'} label="Payable" onPress={() => setKind('SUPPLIER')} /></View></View>
      <TextInput accessibilityLabel="Search" placeholder="Search party…" placeholderTextColor={c.muted} value={q} onChangeText={(v) => { setQ(v); load(v); }} style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 12, fontSize: 16, marginBottom: 8 }} />
      <Card><T size="sm" muted>Total {kind === 'CUSTOMER' ? 'receivable' : 'payable'}</T><T size="xl" bold color={kind === 'CUSTOMER' ? '#16A34A' : '#DC2626'}>{formatINR(total)}</T></Card>
      <FlatList data={rows} keyExtractor={(r) => r.partyId} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} ListEmptyComponent={<T muted>No outstanding dues found.</T>}
        renderItem={({ item: r }) => <Card style={{ gap: 6 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T bold>{r.name}</T><T bold>{formatINR(r.total)}</T></View>
          <T size="xs" muted>0-30: {formatINR(r.b0_30, { decimals: false })} · 31-60: {formatINR(r.b31_60, { decimals: false })} · 61-90: {formatINR(r.b61_90, { decimals: false })} · 90+: {formatINR(r.b90p, { decimals: false })}</T>
          <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button kind="ghost" label="Ledger" onPress={() => router.push(`/ledger/${r.partyId}` as any)} /></View>{kind === 'CUSTOMER' && <View style={{ flex: 1 }}><Button kind="ghost" label="WhatsApp" onPress={() => remind(r)} /></View>}</View></Card>} />
    </Screen>
  );
}
