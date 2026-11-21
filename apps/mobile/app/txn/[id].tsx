import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { useRepo } from '../../src/lib/useRepo';
import { makePdf, printHtml, sendPdfToWhatsApp, sharePdf } from '../../src/lib/share';
import { PdfPreview } from '../../src/ui/PdfPreview';
import { slipHtml, whatsappMessage, type Lang } from '../../src/lib/slip';
import { publicSettings } from '../../src/lib/shop';
import { Amount, Banner, Button, Card, Screen, Segmented, T } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';
import { fmtDMY } from '../../src/ui/DatePicker';

const TITLE: Record<string, string> = { SALE: 'Sale', PURCHASE: 'Purchase', RECEIPT: 'Receipt', PAYMENT: 'Payment', EXPENSE: 'Kharcha' };
export default function TxnDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const repo = useRepo(); const router = useRouter(); const { c } = useTheme();
  const [tx, setTx] = useState<any>(null); const [items, setItems] = useState<any[]>([]); const [prev, setPrev] = useState(0); const [lang, setLang] = useState<Lang>('en'); const [msg, setMsg] = useState(''); const [html, setHtml] = useState(''); const [sending, setSending] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!repo || !id) return;
    (async () => { const t = await repo.getTransaction(id); setTx(t); setItems(t ? await repo.billItems(id) : []); setPrev(t ? await repo.balanceBefore(id) : 0); })();
  }, [repo, id]));
  if (!tx) return <Screen><Stack.Screen options={{ headerShown: true, title: 'Details' }} /><T muted>{repo ? 'Entry not found.' : 'Loading…'}</T></Screen>;
  const bill = tx.type === 'SALE' || tx.type === 'PURCHASE'; const editable = ['SALE', 'PURCHASE', 'RECEIPT', 'PAYMENT'].includes(tx.type);
  const data = async () => { const co = await repo!.company(); const s = await publicSettings(); return { shop: { name: co?.name, nameHi: co?.name_hi, address: [co?.address, co?.city].filter(Boolean).join(', '), phone: co?.phone, gstin: co?.gstin, upi: s.upi_id }, txn: tx, items, party: tx.party_name ?? '', partyHi: tx.party_name_hi, prevBalance: prev, lang }; };
  const act = async (a: 'pdf' | 'print' | 'send' | 'preview') => {
    try {
      const d = await data(); const h = slipHtml(d);
      if (a === 'preview') setHtml(h);
      else if (a === 'pdf') await sharePdf(h, tx.voucher_no);
      else if (a === 'print') await printHtml(h);
      else {
        if (!tx.party_phone) setMsg('This party has no phone number. Add one to send directly; the share sheet will open instead.');
        setSending(true); const uri = await makePdf(h, tx.voucher_no);
        const how = await sendPdfToWhatsApp(uri, tx.party_phone, whatsappMessage(d)); setMsg(how === 'direct' ? '' : tx.party_phone ? 'Choose WhatsApp, then the customer, to send the PDF.' : msg);
      }
    } catch (e: any) { setMsg(e.message); } finally { setSending(false); }
  };
  const del = () => Alert.alert('Delete entry?', `${tx.voucher_no} moves to Recycle Bin for 30 days.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await repo!.softDelete(id!); router.back(); } }]);
  const closing = tx.type === 'RECEIPT' ? prev - tx.total_paise : tx.type === 'PAYMENT' ? prev + tx.total_paise : tx.type === 'PURCHASE' ? prev - tx.total_paise : tx.type === 'SALE' ? prev + tx.total_paise : prev;
  return (
    <Screen><Stack.Screen options={{ headerShown: true, title: `${TITLE[tx.type] ?? tx.type} ${tx.voucher_no}` }} />
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Card style={{ backgroundColor: c.hero, gap: 4 }}>
          <T size="xs" color="#FFFFFFB3">{TITLE[tx.type] ?? tx.type} · {tx.voucher_no} · {fmtDMY(tx.date)}</T>
          <T size="xl" bold color="#fff">{tx.party_name ?? tx.narration ?? 'Kharcha'}{tx.party_name_hi ? ` · ${tx.party_name_hi}` : ''}</T>
          <T size="xxl" bold color="#fff">{formatINR(tx.total_paise)}</T>
          {!!tx.party_phone && <T size="xs" color="#FFFFFFB3">{tx.party_phone}</T>}
        </Card>
        {bill && <Card style={{ gap: 12 }}>{items.map((i, n) => (
          <View key={i.id ?? n} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingBottom: 10, borderBottomWidth: n < items.length - 1 ? 1 : 0, borderBottomColor: c.border }}>
            <View style={{ flex: 1 }}><T bold>{i.item_name}</T><T size="sm" muted>{i.qty} {i.unit} × {formatINR(i.rate_paise)}</T>{(i.commission_paise > 0 || i.delivery_paise > 0) && <T size="xs" muted>{i.commission_paise > 0 ? `Commission ${formatINR(i.commission_paise)}  ` : ''}{i.delivery_paise > 0 ? `Delivery ${formatINR(i.delivery_paise)}` : ''}</T>}</View>
            <T bold>{formatINR(i.gross_paise)}</T></View>))}</Card>}
        {!bill && !!tx.mode && <Card style={{ gap: 4 }}><T bold>{tx.mode}</T><T size="sm" muted>{[tx.bank_name, tx.cheque_no ? 'Cheque #' + tx.cheque_no : '', tx.ref_no ? 'UTR ' + tx.ref_no : '', tx.cheque_date ? fmtDMY(tx.cheque_date) : '', tx.cleared === 0 ? 'Not cleared' : ''].filter(Boolean).join(' · ')}</T></Card>}
        {!!tx.narration && tx.party_name && <Card><T size="xs" muted>Narration</T><T>{tx.narration}</T></Card>}
        {!!tx.party_id && <Card style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><T size="xs" muted>Previous balance</T><Amount paise={prev} bold /></View><View style={{ flex: 1 }}><T size="xs" muted>{bill ? 'Total balance' : 'Remaining balance'}</T><Amount paise={closing} bold /></View></Card>}
        {!!msg && <Banner tone="error" text={msg} />}
        <Segmented value={lang} onChange={setLang} options={[{ key: 'en', label: 'English' }, { key: 'hi', label: 'हिन्दी' }]} />
        <Button icon="logo-whatsapp" label="Send PDF on WhatsApp" onPress={() => act('send')} loading={sending} />
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button kind="ghost" icon="eye" label="Preview" onPress={() => act('preview')} /></View><View style={{ flex: 1 }}><Button kind="ghost" icon="share-outline" label="Share" onPress={() => act('pdf')} /></View><View style={{ flex: 1 }}><Button kind="ghost" icon="print" label="Print" onPress={() => act('print')} /></View></View>
        <PdfPreview html={html} visible={!!html} onClose={() => setHtml('')} sending={sending} onSend={() => act('send')} onShare={() => act('pdf')} onPrint={() => act('print')} />
        {editable && <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button kind="ghost" icon="create" label="Edit" onPress={() => router.push({ pathname: '/(tabs)/entry', params: { edit: id } } as any)} /></View><View style={{ flex: 1 }}><Button kind="ghost" icon="copy" label="Duplicate" onPress={() => router.push({ pathname: '/(tabs)/entry', params: { dup: id } } as any)} /></View></View>}
        <Button kind="danger" icon="trash" label="Delete" onPress={del} />
      </ScrollView></Screen>
  );
}
