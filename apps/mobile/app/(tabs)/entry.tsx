import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { commissionPaise, formatINR, grossPaise, toPaise } from '@mandimart/shared';
import { today, useRepo } from '../../src/lib/useRepo';
import { Banner, Button, Card, Field, Screen, T } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

type Kind = 'SALE' | 'PURCHASE' | 'RECEIPT' | 'PAYMENT' | 'EXPENSE';
export default function Entry() {
  const repo = useRepo(); const { c } = useTheme();
  const [kind, setKind] = useState<Kind>('SALE'); const [parties, setParties] = useState<any[]>([]); const [party, setParty] = useState('');
  const [item, setItem] = useState(''); const [qty, setQty] = useState(''); const [rate, setRate] = useState(''); const [com, setCom] = useState('0'); const [del, setDel] = useState('0');
  const [amt, setAmt] = useState(''); const [mode, setMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH'); const [cat, setCat] = useState('');
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  useFocusEffect(useCallback(() => { (repo as any)?.db.all("SELECT id,name,type FROM accounts WHERE type IN ('CUSTOMER','SUPPLIER') AND deleted_at IS NULL ORDER BY name").then(setParties); }, [repo]));

  const bill = kind === 'SALE' || kind === 'PURCHASE';
  const gross = bill ? grossPaise(Number(qty) || 0, toPaise(rate || 0)) : 0;
  const extra = commissionPaise(gross, Number(com) || 0) + toPaise(del || 0);
  const net = bill ? (kind === 'SALE' ? gross + extra : gross - extra) : 0;

  const save = async () => {
    try {
      if (!repo) return;
      if (kind !== 'EXPENSE' && !party) throw new Error('Select a party');
      let r;
      if (bill) {
        if (!item.trim() || !(Number(qty) > 0) || !(Number(rate) > 0)) throw new Error('Enter item, qty and rate');
        const lines = [{ itemName: item.trim(), qty: Number(qty), unit: 'KG', ratePaise: toPaise(rate), commissionPct: Number(com) || 0, deliveryPaise: toPaise(del || 0) }];
        r = kind === 'SALE' ? await repo.createSale({ partyId: party, date: today(), lines }) : await repo.createPurchase({ partyId: party, date: today(), lines });
      } else if (kind === 'EXPENSE') {
        if (!(Number(amt) > 0)) throw new Error('Enter amount');
        r = await repo.createExpense({ date: today(), amountPaise: toPaise(amt), category: cat || 'Kharcha' });
      } else {
        if (!(Number(amt) > 0)) throw new Error('Enter amount');
        r = await repo.createCashVoucher({ kind, partyId: party, date: today(), amountPaise: toPaise(amt), mode });
      }
      setMsg({ t: `Saved ${r.voucherNo}` }); setItem(''); setQty(''); setRate(''); setAmt(''); setCat('');
    } catch (e: any) { setMsg({ t: e.message, err: true }); }
  };
  const chip = (k: Kind, l: string) => <Pressable key={k} accessibilityRole="button" onPress={() => setKind(k)} style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: kind === k ? c.primary : c.surface, borderWidth: 1, borderColor: c.border }}><Text style={{ color: kind === k ? '#fff' : c.text }}>{l}</Text></Pressable>;
  return (
    <Screen><ScrollView contentContainerStyle={{ gap: 12, paddingTop: 32 }} keyboardShouldPersistTaps="handled">
      <T size="xl" bold>New entry</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{chip('SALE', 'Sale')}{chip('PURCHASE', 'Purchase')}{chip('RECEIPT', 'Receipt')}{chip('PAYMENT', 'Payment')}{chip('EXPENSE', 'Kharcha')}</ScrollView>
      {kind !== 'EXPENSE' && <Card><T size="sm" muted>Party</T><ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>{parties.map((p) => <Pressable key={p.id} onPress={() => setParty(p.id)} style={{ minHeight: 44, justifyContent: 'center' }}><T bold={party === p.id} color={party === p.id ? c.primary : undefined}>{party === p.id ? '✓ ' : ''}{p.name} <T size="xs" muted>({p.type})</T></T></Pressable>)}{!parties.length && <T muted>Add a party first (Parties tab).</T>}</ScrollView></Card>}
      {bill ? <>
        <Field label="Item" value={item} onChangeText={setItem} />
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="Qty (KG)" keyboardType="decimal-pad" value={qty} onChangeText={setQty} /></View><View style={{ flex: 1 }}><Field label="Rate ₹/KG" keyboardType="decimal-pad" value={rate} onChangeText={setRate} /></View></View>
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="Commission %" keyboardType="decimal-pad" value={com} onChangeText={setCom} /></View><View style={{ flex: 1 }}><Field label="Delivery ₹" keyboardType="decimal-pad" value={del} onChangeText={setDel} /></View></View>
        <Card><T muted>Gross {formatINR(gross)}</T><T size="lg" bold>{kind === 'SALE' ? 'Bill total' : 'Net payable'}: {formatINR(net)}</T></Card>
      </> : <>
        <Field label="Amount ₹" keyboardType="decimal-pad" value={amt} onChangeText={setAmt} />
        {kind === 'EXPENSE' ? <Field label="Category (rent, labour, transport…)" value={cat} onChangeText={setCat} /> :
          <View style={{ flexDirection: 'row', gap: 8 }}>{(['CASH', 'UPI', 'BANK'] as const).map((m) => <View key={m} style={{ flex: 1 }}><Button kind={mode === m ? 'primary' : 'ghost'} label={m} onPress={() => setMode(m)} /></View>)}</View>}
      </>}
      {msg && <Banner tone={msg.err ? 'error' : 'warn'} text={msg.t} />}
      <Button label="Save" onPress={save} disabled={!repo} />
    </ScrollView></Screen>
  );
}
