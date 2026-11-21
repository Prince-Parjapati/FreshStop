import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { commissionPaise, formatINR, grossPaise, toPaise } from '@mandimart/shared';
import { today, useRepo } from '../../src/lib/useRepo';
import { Banner, Button, Card, Field, Screen, T } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';
import { useT } from '../../src/i18n';

type Kind = 'SALE' | 'PURCHASE' | 'RECEIPT' | 'PAYMENT' | 'EXPENSE';
interface Line { itemName: string; qty: string; unit: string; rate: string; com: string; del: string; }
const blank = (com = '0'): Line => ({ itemName: '', qty: '', unit: 'KG', rate: '', com, del: '0' });
const UNITS = ['KG', 'QTL', 'PCS', 'BOX', 'BAG', 'DZN', 'CRATE'];

export default function Entry() {
  const repo = useRepo(); const { c } = useTheme(); const t = useT(); const router = useRouter();
  const { edit, dup } = useLocalSearchParams<{ edit?: string; dup?: string }>();
  const [kind, setKind] = useState<Kind>('SALE'); const [parties, setParties] = useState<any[]>([]); const [items, setItems] = useState<any[]>([]); const [party, setParty] = useState('');
  const [lines, setLines] = useState<Line[]>([blank()]); const [amt, setAmt] = useState(''); const [mode, setMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH'); const [cat, setCat] = useState('');
  const [date, setDate] = useState(today()); const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null); const [pq, setPq] = useState('');

  useFocusEffect(useCallback(() => {
    if (!repo) return;
    (repo as any).db.all("SELECT id,name,type,default_commission_pct com FROM accounts WHERE type IN ('CUSTOMER','SUPPLIER') AND deleted_at IS NULL ORDER BY name").then(setParties);
    repo.listItems().then(setItems);
  }, [repo]));

  // load a bill for edit / duplicate
  useEffect(() => {
    const id = edit || dup; if (!repo || !id) return;
    (async () => {
      const [tx] = await repo.transactions({ limit: 1000 }).then((r) => r.filter((x) => x.id === id));
      if (!tx) return;
      setKind(tx.type); setParty(tx.party_id ?? ''); setDate(dup ? today() : tx.date); setEditId(edit ? id : null);
      if (tx.type === 'SALE' || tx.type === 'PURCHASE') setLines((await repo.billItems(id)).map((b: any) => ({ itemName: b.item_name, qty: String(b.qty), unit: b.unit, rate: String(b.rate_paise / 100), com: String(b.commission_pct), del: String(b.delivery_paise / 100) })));
      else setAmt(String(tx.total_paise / 100)), setMode(tx.mode === 'CASH' || tx.mode === 'BANK' ? tx.mode : 'UPI');
    })();
  }, [repo, edit, dup]);

  const bill = kind === 'SALE' || kind === 'PURCHASE';
  const calc = lines.map((l) => { const g = grossPaise(Number(l.qty) || 0, toPaise(l.rate || 0)); const x = commissionPaise(g, Number(l.com) || 0) + toPaise(l.del || 0); return { g, net: kind === 'SALE' ? g + x : g - x }; });
  const gross = calc.reduce((s, x) => s + x.g, 0), net = calc.reduce((s, x) => s + x.net, 0);
  const setLine = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const pickParty = async (id: string) => { setParty(id); const p = parties.find((x) => x.id === id); if (p?.com && lines.length === 1 && !lines[0]!.itemName) setLine(0, 'com', String(p.com)); };
  const pickItem = async (i: number, name: string, unit?: string, defRate?: number) => {
    setLine(i, 'itemName', name); if (unit) setLine(i, 'unit', unit);
    const last = party ? await repo!.lastRate(party, name) : null;
    const rate = last?.rate_paise ?? defRate; if (rate) setLine(i, 'rate', String(rate / 100));
    if (last) setLine(i, 'com', String(last.commission_pct));
  };
  const reset = () => { setLines([blank()]); setAmt(''); setCat(''); setEditId(null); setDate(today()); router.setParams({ edit: undefined, dup: undefined } as any); };

  const save = async () => {
    try {
      if (!repo) return;
      if (kind !== 'EXPENSE' && !party) throw new Error('Select a party');
      let r;
      if (bill) {
        const ls = lines.filter((l) => l.itemName.trim() || l.qty || l.rate);
        if (!ls.length || ls.some((l) => !l.itemName.trim() || !(Number(l.qty) > 0) || !(Number(l.rate) > 0))) throw new Error('Enter item, qty and rate on every line');
        const payload = { partyId: party, date, lines: ls.map((l) => ({ itemName: l.itemName.trim(), qty: Number(l.qty), unit: l.unit, ratePaise: toPaise(l.rate), commissionPct: Number(l.com) || 0, deliveryPaise: toPaise(l.del || 0) })) };
        for (const l of ls) if (!items.some((x) => x.name.toLowerCase() === l.itemName.trim().toLowerCase())) await repo.addItem({ name: l.itemName.trim(), unit: l.unit, ratePaise: toPaise(l.rate) });
        r = editId ? await repo.editBill(editId, payload) : kind === 'SALE' ? await repo.createSale(payload) : await repo.createPurchase(payload);
      } else if (kind === 'EXPENSE') {
        if (!(Number(amt) > 0)) throw new Error('Enter amount');
        r = await repo.createExpense({ date, amountPaise: toPaise(amt), category: cat || 'Kharcha' });
      } else {
        if (!(Number(amt) > 0)) throw new Error('Enter amount');
        const v = { partyId: party, date, amountPaise: toPaise(amt), mode };
        r = editId ? await repo.editCashVoucher(editId, v) : await repo.createCashVoucher({ kind, ...v });
      }
      setMsg({ t: `${editId ? 'Updated' : 'Saved'} ${r.voucherNo}` }); reset(); repo.listItems().then(setItems);
    } catch (e: any) { setMsg({ t: e.message, err: true }); }
  };
  const chip = (k: Kind, l: string) => <Pressable key={k} accessibilityRole="button" disabled={!!editId} onPress={() => setKind(k)} style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: kind === k ? c.primary : c.surface, borderWidth: 1, borderColor: c.border, opacity: editId && kind !== k ? 0.4 : 1 }}><Text style={{ color: kind === k ? '#fff' : c.text }}>{l}</Text></Pressable>;
  const ps = pq.trim().toLowerCase();
  return (
    <Screen><ScrollView contentContainerStyle={{ gap: 12, paddingTop: 32, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <T size="xl" bold>{editId ? 'Edit entry' : t('entry')}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{chip('SALE', 'Sale')}{chip('PURCHASE', 'Purchase')}{chip('RECEIPT', 'Receipt')}{chip('PAYMENT', 'Payment')}{chip('EXPENSE', 'Kharcha')}</ScrollView>
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      {kind !== 'EXPENSE' && <Card style={{ gap: 6 }}><T size="sm" muted>Party</T><Field label="Search party" value={pq} onChangeText={setPq} />
        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>{parties.filter((p) => !ps || p.name.toLowerCase().includes(ps)).map((p) => <Pressable key={p.id} onPress={() => pickParty(p.id)} style={{ minHeight: 44, justifyContent: 'center' }}><T bold={party === p.id} color={party === p.id ? c.primary : undefined}>{party === p.id ? '✓ ' : ''}{p.name} ({p.type})</T></Pressable>)}{!parties.length && <T muted>Add a party first (Parties tab).</T>}</ScrollView></Card>}
      {bill ? <>
        {lines.map((l, i) => {
          const q = l.itemName.trim().toLowerCase(); const sugg = q ? items.filter((x) => x.name.toLowerCase().includes(q) && x.name.toLowerCase() !== q).slice(0, 4) : [];
          return (
            <Card key={i} style={{ gap: 8 }}>
              <Field label={`Item ${i + 1}`} value={l.itemName} onChangeText={(v) => setLine(i, 'itemName', v)} onEndEditing={() => { const m = items.find((x) => x.name.toLowerCase() === l.itemName.trim().toLowerCase()); if (m) pickItem(i, m.name, m.unit, m.default_rate_paise); else if (party && l.itemName.trim()) pickItem(i, l.itemName.trim()); }} />
              {sugg.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{sugg.map((x) => <Pressable key={x.id} onPress={() => pickItem(i, x.name, x.unit, x.default_rate_paise)} style={{ paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', borderRadius: 20, backgroundColor: c.soft }}><Text style={{ color: c.text }}>{x.name}</Text></Pressable>)}</View>}
              <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="Qty" keyboardType="decimal-pad" value={l.qty} onChangeText={(v) => setLine(i, 'qty', v)} /></View><View style={{ flex: 1 }}><Field label={`Rate ₹/${l.unit}`} keyboardType="decimal-pad" value={l.rate} onChangeText={(v) => setLine(i, 'rate', v)} /></View></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{UNITS.map((u) => <Pressable key={u} onPress={() => setLine(i, 'unit', u)} style={{ paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', borderRadius: 20, backgroundColor: l.unit === u ? c.primary : c.surface, borderWidth: 1, borderColor: c.border }}><Text style={{ color: l.unit === u ? '#fff' : c.text }}>{u}</Text></Pressable>)}</ScrollView>
              <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Field label="Commission %" keyboardType="decimal-pad" value={l.com} onChangeText={(v) => setLine(i, 'com', v)} /></View><View style={{ flex: 1 }}><Field label="Delivery ₹" keyboardType="decimal-pad" value={l.del} onChangeText={(v) => setLine(i, 'del', v)} /></View></View>
              <T muted>Line: {formatINR(calc[i]!.net)}</T>
              {lines.length > 1 && <Button kind="ghost" label="Remove line" onPress={() => setLines((ls) => ls.filter((_, j) => j !== i))} />}
            </Card>);
        })}
        <Button kind="ghost" label="+ Add item" onPress={() => setLines((ls) => [...ls, blank(ls[ls.length - 1]?.com)])} />
        <Card><T muted>Gross {formatINR(gross)}</T><T size="lg" bold>{kind === 'SALE' ? 'Bill total' : 'Net payable'}: {formatINR(net)}</T></Card>
      </> : <>
        <Field label="Amount ₹" keyboardType="decimal-pad" value={amt} onChangeText={setAmt} />
        {kind === 'EXPENSE' ? <Field label="Category (rent, labour, transport…)" value={cat} onChangeText={setCat} /> :
          <View style={{ flexDirection: 'row', gap: 8 }}>{(['CASH', 'UPI', 'BANK'] as const).map((m) => <View key={m} style={{ flex: 1 }}><Button kind={mode === m ? 'primary' : 'ghost'} label={m} onPress={() => setMode(m)} /></View>)}</View>}
      </>}
      {msg && <Banner tone={msg.err ? 'error' : 'warn'} text={msg.t} />}
      <Button label={editId ? 'Update' : t('save')} onPress={save} disabled={!repo} />
      {editId && <Button kind="ghost" label="Cancel edit" onPress={reset} />}
    </ScrollView></Screen>
  );
}
