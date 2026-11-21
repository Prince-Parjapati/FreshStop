import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { evaluateCommissionRate, evaluateMath, toPaise } from '@mandimart/shared';
import { useRepo } from '../src/lib/useRepo';
import { toHindi } from '../src/lib/translate';
import { Banner, Button, Card, Field, Screen, T } from '../src/ui/kit';

const empty = { name: '', nameHi: '', phone: '', address: '', city: '', gstin: '', pan: '', bankName: '', bankAccountNo: '', bankIfsc: '', opening: '', com: '', creditDays: '', creditLimit: '' };
export default function PartyForm() {
  const { id, type: tp, name: preName, back } = useLocalSearchParams<{ id?: string; type?: string; name?: string; back?: string }>();
  const repo = useRepo(); const router = useRouter();
  const [type, setType] = useState<'CUSTOMER' | 'SUPPLIER'>(tp === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER'); const [f, setF] = useState({ ...empty, name: preName ?? '' }); const [side, setSide] = useState<'DR' | 'CR'>('DR');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const set = (k: keyof typeof empty) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => {
    if (!repo || !id) return;
    repo.getAccount(id).then((a) => { if (!a) return; setType(a.type); setSide(a.opening_paise < 0 ? 'CR' : 'DR');
      setF({ name: a.name, nameHi: a.name_hi ?? '', phone: a.phone ?? '', address: a.address ?? '', city: a.city ?? '', gstin: a.gstin ?? '', pan: a.pan ?? '', bankName: a.bank_name ?? '', bankAccountNo: a.bank_account_no ?? '', bankIfsc: a.bank_ifsc ?? '', opening: a.opening_paise ? String(Math.abs(a.opening_paise) / 100) : '', com: a.default_commission_pct ? String(a.default_commission_pct) : '', creditDays: a.credit_days ? String(a.credit_days) : '', creditLimit: a.credit_limit_paise ? String(a.credit_limit_paise / 100) : '' }); });
  }, [repo, id]);
  const pickContact = async () => {
    try {
      const perm = await Contacts.requestPermissionsAsync(); if (perm.status !== 'granted') return setErr('Contacts permission denied. You can type the details instead.');
      const c = await Contacts.presentContactPickerAsync(); if (!c) return;
      const ph = (c.phoneNumbers?.[0]?.number ?? '').replace(/[^\d]/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
      setF((p) => ({ ...p, name: p.name || c.name || '', phone: ph || p.phone })); setErr('');
    } catch (e: any) { setErr(e.message ?? 'Could not open contacts'); }
  };
  const tr = async () => { const h = await toHindi(f.name); if (h) setF((p) => ({ ...p, nameHi: h })); else setErr('Could not translate (offline?). Type the Hindi name manually.'); };
  const save = async () => {
    const name = f.name.trim().replace(/\s+/g, ' '); if (name.length < 2) return setErr('Name is required');
    if (f.phone && !/^\d{10}$/.test(f.phone.replace(/\D/g, '').slice(-10))) return setErr('Enter a valid 10-digit phone number');
    const com = evaluateCommissionRate(f.com); if (com > 100) return setErr('Commission cannot exceed 100%');
    setBusy(true);
    try {
      const open = Math.abs(toPaise(evaluateMath(f.opening))) * (side === 'CR' ? -1 : 1);
      const input = { name, nameHi: f.nameHi, type, phone: f.phone ? f.phone.replace(/\D/g, '').slice(-10) : undefined, address: f.address, city: f.city, gstin: f.gstin.toUpperCase(), pan: f.pan.toUpperCase(), bankName: f.bankName, bankAccountNo: f.bankAccountNo, bankIfsc: f.bankIfsc.toUpperCase(), openingPaise: open, commissionPct: com, creditDays: Number(f.creditDays) || undefined, creditLimitPaise: f.creditLimit ? toPaise(f.creditLimit) : undefined };
      if (id) await repo!.updateAccount(id, input); else { const dup = (await repo!.listAccounts({ search: name })).find((a: any) => a.name.toLowerCase() === name.toLowerCase()); if (dup) { setBusy(false); return setErr('A party with this name already exists'); } await repo!.addAccount(input); }
      router.back();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  const del = () => Alert.alert('Delete party?', 'The party moves to the Recycle Bin for 30 days. Its entries stay in your books.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await repo!.deleteAccount(id!); router.dismissTo?.('/(tabs)/parties' as any) ?? router.back(); } }]);
  return (
    <Screen style={{ paddingTop: 8 }}><Stack.Screen options={{ headerShown: true, title: id ? 'Edit party' : 'New party' }} />
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button kind={type === 'CUSTOMER' ? 'primary' : 'ghost'} label="Customer (buyer)" onPress={() => setType('CUSTOMER')} /></View><View style={{ flex: 1 }}><Button kind={type === 'SUPPLIER' ? 'primary' : 'ghost'} label="Supplier (farmer)" onPress={() => setType('SUPPLIER')} /></View></View>
        <Button kind="ghost" label="📇 Pick from contacts" onPress={pickContact} />
        <Field label="Name *" value={f.name} onChangeText={set('name')} />
        <Field label="Name (Hindi)" value={f.nameHi} onChangeText={set('nameHi')} /><Button kind="ghost" label="Auto-translate name to Hindi" onPress={tr} />
        <Field label="Phone" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
        <Field label="Address" value={f.address} onChangeText={set('address')} /><Field label="City" value={f.city} onChangeText={set('city')} />
        <Card style={{ gap: 8 }}><T bold>Opening balance</T>
          <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 2 }}><Field label="Amount ₹" keyboardType="decimal-pad" value={f.opening} onChangeText={set('opening')} /></View><View style={{ flex: 1, justifyContent: 'flex-end', gap: 6 }}><Button kind={side === 'DR' ? 'primary' : 'ghost'} label="DR (lena)" onPress={() => setSide('DR')} /></View><View style={{ flex: 1, justifyContent: 'flex-end' }}><Button kind={side === 'CR' ? 'primary' : 'ghost'} label="CR (dena)" onPress={() => setSide('CR')} /></View></View>
          <T size="xs" muted>DR = party owes you. CR = you owe the party.</T></Card>
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="Commission % (50+20 ok)" keyboardType="numbers-and-punctuation" value={f.com} onChangeText={(v) => set('com')(v.replace(/[^0-9.+]/g, ''))} /></View><View style={{ flex: 1 }}><Field label="Credit days" keyboardType="number-pad" value={f.creditDays} onChangeText={set('creditDays')} /></View></View>
        <Field label="Credit limit ₹ (warns when exceeded)" keyboardType="decimal-pad" value={f.creditLimit} onChangeText={set('creditLimit')} />
        <Card style={{ gap: 8 }}><T bold>Tax & bank (optional)</T><Field label="GST No" autoCapitalize="characters" value={f.gstin} onChangeText={set('gstin')} /><Field label="PAN No" autoCapitalize="characters" value={f.pan} onChangeText={set('pan')} /><Field label="Bank name" value={f.bankName} onChangeText={set('bankName')} /><Field label="Account no." keyboardType="number-pad" value={f.bankAccountNo} onChangeText={set('bankAccountNo')} /><Field label="IFSC" autoCapitalize="characters" value={f.bankIfsc} onChangeText={set('bankIfsc')} /></Card>
        {!!err && <Banner tone="error" text={err} />}
        <Button label={id ? 'Save changes' : 'Add party'} onPress={save} loading={busy} />
        {!!id && <Button kind="danger" label="Delete party" onPress={del} />}
      </ScrollView></Screen>
  );
}
