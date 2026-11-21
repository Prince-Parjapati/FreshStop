import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useRepo } from '../src/lib/useRepo';
import { useT } from '../src/i18n';
import { Banner, Button, Field, Screen } from '../src/ui/kit';
export default function Shop() {
  const repo = useRepo(); const t = useT(); const [f, setF] = useState({ name: '', address: '', phone: '', gstin: '', fy: '4' }); const [ok, setOk] = useState(false);
  useEffect(() => { repo?.company().then((c) => c && setF({ name: c.name ?? '', address: c.address ?? '', phone: c.phone ?? '', gstin: c.gstin ?? '', fy: String(c.fy_start_month) })); }, [repo]);
  const s = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: t('shop') }} /><ScrollView contentContainerStyle={{ gap: 12 }}>
      <Field label="Shop name" value={f.name} onChangeText={s('name')} /><Field label="Address" value={f.address} onChangeText={s('address')} />
      <Field label="Phone" keyboardType="number-pad" value={f.phone} onChangeText={s('phone')} /><Field label="GSTIN (optional)" autoCapitalize="characters" value={f.gstin} onChangeText={s('gstin')} />
      <Field label="Financial year starts in month (1-12)" keyboardType="number-pad" value={f.fy} onChangeText={s('fy')} />
      {ok && <Banner text="Saved" />}
      <Button label={t('save')} onPress={async () => { const m = Math.min(12, Math.max(1, Number(f.fy) || 4)); await repo!.saveCompany({ name: f.name.trim(), address: f.address, phone: f.phone, gstin: f.gstin, fyStartMonth: m }); setOk(true); }} />
    </ScrollView></Screen>
  );
}
