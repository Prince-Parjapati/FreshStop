import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { evaluateMath, toPaise } from '@mandimart/shared';
import { useRepo } from '../src/lib/useRepo';
import { toHindi } from '../src/lib/translate';
import { Banner, Button, Field, Screen, T } from '../src/ui/kit';
import { useTheme } from '../src/ui/theme';

const UNITS = ['KG', 'PCS', 'BAG', 'DZN', 'CRATE'];
const CATS = ['Vegetable', 'Fruit', 'Leafy', 'Other'];
export default function ItemForm() {
  const { id } = useLocalSearchParams<{ id?: string }>(); const repo = useRepo(); const router = useRouter(); const { c } = useTheme();
  const [f, setF] = useState({ name: '', nameHi: '', unit: 'KG', rate: '', hsn: '', gst: '', category: '' }); const [err, setErr] = useState(''); const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => { if (repo && id) repo.getItem(id).then((i) => i && setF({ name: i.name, nameHi: i.name_hi ?? '', unit: i.unit, rate: i.default_rate_paise ? String(i.default_rate_paise / 100) : '', hsn: i.hsn_code ?? '', gst: i.gst_rate ? String(i.gst_rate) : '', category: i.category ?? '' })); }, [repo, id]);
  const autoHi = async () => { if (f.nameHi || !f.name.trim()) return; const h = await toHindi(f.name); if (h) setF((p) => (p.nameHi ? p : { ...p, nameHi: h })); };
  const save = async () => {
    const name = f.name.trim().replace(/\s+/g, ' '); if (!name) return setErr('Item name is required'); if (/\d/.test(name)) return setErr('Item name must not contain numbers');
    const gst = Number(f.gst) || 0; if (gst < 0 || gst > 100) return setErr('GST rate must be 0–100');
    const dup = (await repo!.listItems(name)).find((x: any) => x.name.toLowerCase() === name.toLowerCase() && x.id !== id); if (dup) return setErr('Item already exists');
    const input = { name, nameHi: f.nameHi.trim() || undefined, unit: f.unit, ratePaise: toPaise(evaluateMath(f.rate)), hsn: f.hsn.trim() || undefined, gstRate: gst, category: f.category || undefined };
    if (id) await repo!.updateItem(id, input); else await repo!.addItem(input); router.back();
  };
  const chip = (label: string, on: boolean, fn: () => void) => <Pressable key={label} onPress={fn} style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: on ? c.primary : c.surface, borderWidth: 1, borderColor: c.border }}><Text style={{ color: on ? '#fff' : c.text }}>{label}</Text></Pressable>;
  return (
    <Screen style={{ paddingTop: 8 }}><Stack.Screen options={{ headerShown: true, title: id ? 'Edit item' : 'New item' }} />
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Field label="Item name *" value={f.name} onChangeText={set('name')} onEndEditing={autoHi} />
        <Field label="Name (Hindi) — auto-filled, you can edit" value={f.nameHi} onChangeText={set('nameHi')} />
        <T size="sm" muted>Unit</T><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{UNITS.map((u) => chip(u, f.unit === u, () => set('unit')(u)))}</View>
        <Field label="Default rate ₹" keyboardType="decimal-pad" value={f.rate} onChangeText={set('rate')} />
        <T size="sm" muted>Category</T><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{CATS.map((u) => chip(u, f.category === u, () => set('category')(f.category === u ? '' : u)))}</View>
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="HSN code" keyboardType="number-pad" value={f.hsn} onChangeText={set('hsn')} /></View><View style={{ flex: 1 }}><Field label="GST rate %" keyboardType="decimal-pad" value={f.gst} onChangeText={set('gst')} /></View></View>
        {!!err && <Banner tone="error" text={err} />}
        <Button label={id ? 'Save changes' : 'Add item'} onPress={save} />
        {!!id && <Button kind="danger" label="Delete item" onPress={() => Alert.alert('Delete item?', f.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await repo!.deleteItem(id); router.back(); } }])} />}
      </ScrollView></Screen>
  );
}
