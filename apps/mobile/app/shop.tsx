import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import type { PurchaseMode } from '@mandimart/shared';
import { useRepo } from '../src/lib/useRepo';
import { toHindi } from '../src/lib/translate';
import { useT } from '../src/i18n';
import { Banner, Button, Card, Field, Screen, T } from '../src/ui/kit';
export default function Shop() {
  const repo = useRepo(); const t = useT(); const [f, setF] = useState({ name: '', nameHi: '', address: '', city: '', state: '', phone: '', gstin: '', pan: '', fy: '4' }); const [pm, setPm] = useState<PurchaseMode>('ADD'); const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  useEffect(() => { repo?.company().then((c) => { if (!c) return; setF({ name: c.name ?? '', nameHi: c.name_hi ?? '', address: c.address ?? '', city: c.city ?? '', state: c.state ?? '', phone: c.phone ?? '', gstin: c.gstin ?? '', pan: c.pan ?? '', fy: String(c.fy_start_month) }); setPm((c.purchase_mode ?? 'ADD') as PurchaseMode); }); }, [repo]);
  const s = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.name.trim()) return setMsg({ t: 'Company name is required', err: true });
    if (f.gstin && !/^[0-9A-Z]{15}$/i.test(f.gstin.trim())) return setMsg({ t: 'GSTIN must be 15 characters', err: true });
    if (f.pan && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(f.pan.trim())) return setMsg({ t: 'PAN looks invalid (e.g. ABCDE1234F)', err: true });
    await repo!.saveCompany({ name: f.name.trim(), nameHi: f.nameHi.trim(), address: f.address, city: f.city, state: f.state, phone: f.phone, gstin: f.gstin.trim().toUpperCase(), pan: f.pan.trim().toUpperCase(), fyStartMonth: Math.min(12, Math.max(1, Number(f.fy) || 4)), purchaseMode: pm }); setMsg({ t: 'Saved' });
  };
  return (
    <Screen style={{ paddingTop: 8 }}><Stack.Screen options={{ headerShown: true, title: t('shop') }} /><ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <Field label="Company name" value={f.name} onChangeText={s('name')} /><Field label="Company name (Hindi)" value={f.nameHi} onChangeText={s('nameHi')} /><Button kind="ghost" label="Auto-translate to Hindi" onPress={async () => { const h = await toHindi(f.name); if (h) s('nameHi')(h); }} />
      <Field label="Address" value={f.address} onChangeText={s('address')} />
      <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="City" value={f.city} onChangeText={s('city')} /></View><View style={{ flex: 1 }}><Field label="State" value={f.state} onChangeText={s('state')} /></View></View>
      <Field label="Phone" keyboardType="phone-pad" value={f.phone} onChangeText={s('phone')} />
      <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="GST No" autoCapitalize="characters" value={f.gstin} onChangeText={s('gstin')} /></View><View style={{ flex: 1 }}><Field label="PAN No" autoCapitalize="characters" value={f.pan} onChangeText={s('pan')} /></View></View>
      <Field label="Financial year starts in month (1-12)" keyboardType="number-pad" value={f.fy} onChangeText={s('fy')} />
      <Card style={{ gap: 8 }}><T bold>Purchase calculation</T>
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button kind={pm === 'ADD' ? 'primary' : 'ghost'} label="Add comm. + delivery" onPress={() => setPm('ADD')} /></View><View style={{ flex: 1 }}><Button kind={pm === 'DEDUCT' ? 'primary' : 'ghost'} label="Deduct (patti)" onPress={() => setPm('DEDUCT')} /></View></View>
        <T size="xs" muted>{pm === 'ADD' ? 'Payable = gross + commission + delivery (original MandiMart behaviour).' : 'Payable to farmer = gross − commission − delivery; commission and delivery are booked as your income.'}  Applies to new purchases only.</T></Card>
      {msg && <Banner tone={msg.err ? 'error' : 'warn'} text={msg.t} />}
      <Button label={t('save')} onPress={save} />
    </ScrollView></Screen>
  );
}
