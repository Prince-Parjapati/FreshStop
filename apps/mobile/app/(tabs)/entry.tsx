import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { evaluateCommissionRate, evaluateMath, formatINR, grossPaise, purchaseNet, saleNet, type PurchaseMode } from '@mandimart/shared';
import { today, useRepo } from '../../src/lib/useRepo';
import { Amount, Banner, Button, Card, Field, Screen, T } from '../../src/ui/kit';
import { DatePicker } from '../../src/ui/DatePicker';
import { Picker } from '../../src/ui/Picker';
import { useTheme } from '../../src/ui/theme';
import { useT } from '../../src/i18n';

type Kind = 'SALE' | 'PURCHASE' | 'RECEIPT' | 'PAYMENT' | 'EXPENSE';
type Mode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'NEFT';
interface Line { itemName: string; qty: string; unit: string; rate: string; total: string; com: string; del: string; }
const blank = (com = ''): Line => ({ itemName: '', qty: '', unit: 'KG', rate: '', total: '', com, del: '' });
const UNITS = ['KG', 'PCS', 'BAG', 'DZN', 'CRATE'];
const MODES: Mode[] = ['CASH', 'UPI', 'BANK', 'CHEQUE', 'NEFT'];
const r2 = (n: number) => (Math.round(n * 100) / 100).toString();
const paise = (s: string) => Math.round(evaluateMath(s) * 100);
const clean = (v: string) => v.replace(/[^0-9.+\-*/()]/g, '');

export default function Entry() {
  const repo = useRepo(); const { c } = useTheme(); const t = useT(); const router = useRouter();
  const { edit, dup, kind: kindParam, party: partyParam } = useLocalSearchParams<{ edit?: string; dup?: string; kind?: Kind; party?: string }>();
  const [kind, setKind] = useState<Kind>('SALE'); const [parties, setParties] = useState<any[]>([]); const [items, setItems] = useState<any[]>([]); const [party, setParty] = useState('');
  const [lines, setLines] = useState<Line[]>([blank()]); const [amt, setAmt] = useState(''); const [mode, setMode] = useState<Mode>('CASH'); const [cat, setCat] = useState('');
  const [bank, setBank] = useState(''); const [chequeNo, setChequeNo] = useState(''); const [chequeDate, setChequeDate] = useState(today()); const [utr, setUtr] = useState(''); const [narr, setNarr] = useState('');
  const [date, setDate] = useState(today()); const [editId, setEditId] = useState<string | null>(null); const [pmode, setPmode] = useState<PurchaseMode>('ADD');
  const [prev, setPrev] = useState(0); const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null); const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!repo) return;
    repo.listAccounts().then(setParties); repo.listItems().then(setItems);
    repo.company().then((co) => setPmode((co?.purchase_mode ?? 'ADD') as PurchaseMode));
  }, [repo]));
  useEffect(() => { if (kindParam && !edit && !dup) setKind(kindParam); if (partyParam && !edit && !dup) setParty(partyParam); }, [kindParam, partyParam, edit, dup]);

  // previous balance of the selected party (before the entry being edited, else current)
  useEffect(() => {
    if (!repo || !party) { setPrev(0); return; }
    (editId ? repo.balanceBefore(editId) : repo.balance(party)).then(setPrev);
  }, [repo, party, editId, kind]);

  useEffect(() => {
    const id = edit || dup; if (!repo || !id) return;
    (async () => {
      const tx = await repo.getTransaction(id); if (!tx) return;
      setKind(tx.type); setParty(tx.party_id ?? ''); setDate(dup ? today() : tx.date); setEditId(edit ? id : null); setNarr(tx.narration ?? '');
      if (tx.type === 'SALE' || tx.type === 'PURCHASE') setLines((await repo.billItems(id)).map((b: any) => ({ itemName: b.item_name, qty: String(b.qty), unit: b.unit, rate: r2(b.rate_paise / 100), total: r2((b.qty * b.rate_paise) / 100), com: b.commission_pct ? String(b.commission_pct) : '', del: b.delivery_paise ? r2(b.delivery_paise / 100) : '' })));
      else { setAmt(r2(tx.total_paise / 100)); setMode((tx.mode as Mode) ?? 'CASH'); setBank(tx.bank_name ?? ''); setChequeNo(tx.cheque_no ?? ''); setChequeDate(tx.cheque_date ?? today()); setUtr(tx.ref_no ?? ''); }
    })();
  }, [repo, edit, dup]);

  const bill = kind === 'SALE' || kind === 'PURCHASE';
  const calc = lines.map((l) => {
    const g = grossPaise(evaluateMath(l.qty), paise(l.rate)); const b = { gross: g, commissionPct: evaluateCommissionRate(l.com), delivery: paise(l.del) };
    return { g, net: kind === 'SALE' ? saleNet(b) : purchaseNet(b, pmode) };
  });
  const gross = calc.reduce((s, x) => s + x.g, 0), net = calc.reduce((s, x) => s + x.net, 0);
  const party_ = parties.find((p) => p.id === party);
  const after = kind === 'SALE' ? prev + net : kind === 'PURCHASE' ? prev - net : kind === 'RECEIPT' ? prev - paise(amt) : kind === 'PAYMENT' ? prev + paise(amt) : prev;
  const overLimit = kind === 'SALE' && party_?.credit_limit_paise && after > party_.credit_limit_paise;

  // qty/rate drive total; editing total back-solves rate (as in the original app)
  const setLine = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => {
    if (j !== i) return l;
    const n = { ...l, [k]: v };
    const q = evaluateMath(n.qty);
    if (k === 'qty' || k === 'rate') n.total = q > 0 && evaluateMath(n.rate) > 0 ? r2(q * evaluateMath(n.rate)) : '';
    if (k === 'total') n.rate = q > 0 && evaluateMath(v) > 0 ? r2(evaluateMath(v) / q) : n.rate;
    return n;
  }));
  const patchLine = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const pickParty = (id: string) => { setParty(id); const p = parties.find((x) => x.id === id); if (p?.default_commission_pct && !lines.some((l) => l.itemName)) setLines((ls) => ls.map((l) => ({ ...l, com: String(p.default_commission_pct) }))); };
  const pickItem = async (i: number, name: string, unit?: string, defRate?: number) => {
    const last = party ? await repo!.lastRate(party, name) : null;
    const rate = last?.rate_paise ?? defRate; const q = evaluateMath(lines[i]?.qty ?? '');
    patchLine(i, { itemName: name, ...(unit ? { unit } : {}), ...(rate ? { rate: r2(rate / 100), total: q > 0 ? r2((q * rate) / 100) : '' } : {}), ...(last ? { com: last.commission_pct ? String(last.commission_pct) : '' } : {}) });
  };
  const reset = () => { setLines([blank()]); setAmt(''); setCat(''); setEditId(null); setDate(today()); setNarr(''); setUtr(''); setChequeNo(''); setBank(''); router.setParams({ edit: undefined, dup: undefined, kind: undefined, party: undefined } as any); };

  const save = async () => {
    if (!repo || saving) return; setSaving(true);
    try {
      if (kind !== 'EXPENSE' && !party) throw new Error('Select a party');
      let r;
      if (bill) {
        const ls = lines.filter((l) => l.itemName.trim() || l.qty || l.rate);
        if (!ls.length || ls.some((l) => !l.itemName.trim() || !(evaluateMath(l.qty) > 0) || !(evaluateMath(l.rate) > 0))) throw new Error('Enter item, qty and rate on every line');
        const payload = { partyId: party, date, narration: narr || undefined, lines: ls.map((l) => ({ itemName: l.itemName.trim(), qty: evaluateMath(l.qty), unit: l.unit, ratePaise: paise(l.rate), commissionPct: evaluateCommissionRate(l.com), deliveryPaise: paise(l.del) })) };
        for (const l of ls) if (!items.some((x) => x.name.toLowerCase() === l.itemName.trim().toLowerCase())) await repo.addItem({ name: l.itemName.trim(), unit: l.unit, ratePaise: paise(l.rate) });
        r = editId ? await repo.editBill(editId, payload) : kind === 'SALE' ? await repo.createSale(payload) : await repo.createPurchase(payload);
        for (const l of ls) await repo.setItemRate(l.itemName.trim(), paise(l.rate)); // remember last rate as item default
      } else if (kind === 'EXPENSE') {
        if (!(evaluateMath(amt) > 0)) throw new Error('Enter amount');
        r = await repo.createExpense({ date, amountPaise: paise(amt), category: cat || 'Kharcha' });
      } else {
        if (!(evaluateMath(amt) > 0)) throw new Error('Enter amount');
        if (mode === 'CHEQUE' && !chequeNo.trim()) throw new Error('Enter cheque number');
        const v = { partyId: party, date, amountPaise: paise(amt), mode, narration: narr || undefined, refNo: utr || undefined, bankName: bank || undefined, chequeNo: chequeNo || undefined, chequeDate: mode === 'CHEQUE' ? chequeDate : undefined };
        r = editId ? await repo.editCashVoucher(editId, v) : await repo.createCashVoucher({ kind, ...v, cleared: mode !== 'CHEQUE' });
      }
      const id = r.id; const k = kind; const wasEdit = !!editId;
      setMsg({ t: `${wasEdit ? 'Updated' : 'Saved'} ${r.voucherNo}` }); reset(); repo.listItems().then(setItems);
      if (k !== 'EXPENSE') router.push({ pathname: '/txn/[id]', params: { id } } as any);
    } catch (e: any) { setMsg({ t: e.message, err: true }); } finally { setSaving(false); }
  };
  const chip = (k: Kind, l: string) => <Pressable key={k} accessibilityRole="button" disabled={!!editId} onPress={() => setKind(k)} style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: kind === k ? c.primary : c.surface, borderWidth: 1, borderColor: c.border, opacity: editId && kind !== k ? 0.4 : 1 }}><Text style={{ color: kind === k ? '#fff' : c.text }}>{l}</Text></Pressable>;
  const partyType = kind === 'PURCHASE' || kind === 'PAYMENT' ? 'SUPPLIER' : 'CUSTOMER';
  const partyOpts = parties.filter((p) => !editId || true).sort((a, b) => (a.type === partyType ? -1 : 1) - (b.type === partyType ? -1 : 1)).map((p) => ({ id: p.id, title: p.name_hi ? `${p.name} (${p.name_hi})` : p.name, sub: `${p.type === 'CUSTOMER' ? 'Customer' : 'Supplier'}${p.phone ? ' · ' + p.phone : ''}`, right: formatINR(Math.abs(p.balance)) + (p.balance > 0 ? ' Dr' : p.balance < 0 ? ' Cr' : '') }));
  const plus = (i: number, k: 'qty' | 'rate') => <Pressable accessibilityLabel={`Add plus to ${k}`} onPress={() => { const cur = lines[i]![k]; if (cur && !/[+\-*/]$/.test(cur)) setLine(i, k, cur + '+'); }} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '700', fontSize: 18 }}>＋</Text></Pressable>;
  const hint = (s: string) => (/[+\-*/]/.test(s) ? ` = ${r2(evaluateMath(s))}` : '');
  return (
    <Screen><ScrollView contentContainerStyle={{ gap: 12, paddingTop: 32, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <T size="xl" bold>{editId ? 'Edit entry' : t('entry')}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{chip('SALE', 'Sale')}{chip('PURCHASE', 'Purchase')}{chip('RECEIPT', 'Receipt')}{chip('PAYMENT', 'Payment')}{chip('EXPENSE', 'Kharcha')}</ScrollView>
      <DatePicker label="Date" value={date} onChange={setDate} />
      {kind !== 'EXPENSE' && <>
        <Picker label={partyType === 'SUPPLIER' ? 'Supplier / Farmer' : 'Customer'} placeholder="Select party" value={party} options={partyOpts} onSelect={(o) => pickParty(o.id)} onAdd={(q) => router.push({ pathname: '/party-form', params: { type: partyType, name: q, back: '1' } } as any)} addLabel="+ New party" />
        {!!party && <Card style={{ gap: 2 }}><T size="sm" muted>Previous balance</T><Amount paise={prev} bold /></Card>}
      </>}
      {bill ? <>
        {lines.map((l, i) => (
          <Card key={i} style={{ gap: 8 }}>
            <Picker label={`Item ${i + 1}`} placeholder="Select item" value={items.find((x) => x.name.toLowerCase() === l.itemName.toLowerCase())?.id}
              options={items.map((x) => ({ id: x.id, title: x.name_hi ? `${x.name} (${x.name_hi})` : x.name, sub: x.unit, right: x.default_rate_paise ? '₹' + r2(x.default_rate_paise / 100) : '' }))}
              onSelect={(o) => { const m = items.find((x) => x.id === o.id); pickItem(i, m.name, m.unit, m.default_rate_paise); }}
              onAdd={async (q) => { if (!q) return; if (!items.some((x) => x.name.toLowerCase() === q.toLowerCase())) { await repo!.addItem({ name: q, unit: l.unit }); setItems(await repo!.listItems()); } pickItem(i, q); }} addLabel="+ New item" />
            {!!l.itemName && <T size="sm" muted>{l.itemName}</T>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{UNITS.map((u) => <Pressable key={u} onPress={() => patchLine(i, { unit: u })} style={{ paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', borderRadius: 20, backgroundColor: l.unit === u ? c.primary : c.surface, borderWidth: 1, borderColor: c.border }}><Text style={{ color: l.unit === u ? '#fff' : c.text }}>{u}</Text></Pressable>)}</ScrollView>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T size="sm" muted>Qty{hint(l.qty)}</T>{plus(i, 'qty')}</View><Field label="" accessibilityLabel="Quantity" keyboardType="numbers-and-punctuation" value={l.qty} onChangeText={(v) => setLine(i, 'qty', clean(v))} placeholder="0" /></View>
              <View style={{ flex: 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T size="sm" muted>Rate ₹{hint(l.rate)}</T>{plus(i, 'rate')}</View><Field label="" accessibilityLabel="Rate" keyboardType="numbers-and-punctuation" value={l.rate} onChangeText={(v) => setLine(i, 'rate', clean(v))} placeholder="0" /></View>
            </View>
            <Field label="Total amount ₹ (edit to back-calculate rate)" keyboardType="decimal-pad" value={l.total} onChangeText={(v) => setLine(i, 'total', clean(v))} placeholder="0" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Field label="Commission % (50+20 = successive)" keyboardType="numbers-and-punctuation" value={l.com} onChangeText={(v) => patchLine(i, { com: v.replace(/[^0-9.+]/g, '') })} placeholder="0" /></View>
              <View style={{ flex: 1 }}><Field label="Delivery ₹" keyboardType="numbers-and-punctuation" value={l.del} onChangeText={(v) => patchLine(i, { del: clean(v) })} placeholder="0" /></View>
            </View>
            <T muted>Line total: {formatINR(calc[i]!.net)}</T>
            {lines.length > 1 && <Button kind="ghost" label="Remove line" onPress={() => setLines((ls) => ls.filter((_, j) => j !== i))} />}
          </Card>))}
        <Button kind="ghost" label="+ Add item" onPress={() => setLines((ls) => [...ls, blank(ls[ls.length - 1]?.com)])} />
        <Card style={{ gap: 2 }}><T muted>Gross {formatINR(gross)}</T><T size="lg" bold>{kind === 'SALE' ? 'Bill total' : pmode === 'ADD' ? 'Purchase total' : 'Net payable'}: {formatINR(net)}</T>
          {!!party && <><T size="sm" muted>Balance after this bill</T><Amount paise={after} bold /></>}</Card>
        {overLimit && <Banner text={`Credit limit ${formatINR(party_.credit_limit_paise)} will be exceeded.`} />}
      </> : <>
        <Field label="Amount ₹" keyboardType="decimal-pad" value={amt} onChangeText={(v) => setAmt(clean(v))} />
        {kind === 'EXPENSE' ? <Field label="Category (rent, labour, transport…)" value={cat} onChangeText={setCat} /> : <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{MODES.map((m) => <Pressable key={m} onPress={() => setMode(m)} style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: mode === m ? c.primary : c.surface, borderWidth: 1, borderColor: c.border }}><Text style={{ color: mode === m ? '#fff' : c.text }}>{m}</Text></Pressable>)}</ScrollView>
          {mode !== 'CASH' && <Field label="Bank name" value={bank} onChangeText={setBank} />}
          {mode === 'CHEQUE' && <><Field label="Cheque no." keyboardType="number-pad" value={chequeNo} onChangeText={setChequeNo} /><DatePicker label="Cheque date" value={chequeDate} onChange={setChequeDate} /></>}
          {(mode === 'UPI' || mode === 'NEFT' || mode === 'BANK') && <Field label="UTR / Reference no." autoCapitalize="characters" value={utr} onChangeText={setUtr} />}
          {!!party && !!amt && <Card style={{ gap: 2 }}><T size="sm" muted>Remaining balance</T><Amount paise={after} bold /></Card>}
        </>}
      </>}
      {kind !== 'EXPENSE' && <Field label="Narration (optional)" value={narr} onChangeText={setNarr} />}
      {msg && <Banner tone={msg.err ? 'error' : 'warn'} text={msg.t} />}
      <Button label={editId ? 'Update' : t('save')} onPress={save} disabled={!repo} loading={saving} />
      {editId && <Button kind="ghost" label="Cancel edit" onPress={reset} />}
    </ScrollView></Screen>
  );
}
