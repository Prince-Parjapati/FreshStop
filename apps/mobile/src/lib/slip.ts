import { amountInWords, formatINR } from '@mandimart/shared';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export type Lang = 'en' | 'hi';
export interface SlipData { shop: { name: string; nameHi?: string; address?: string; phone?: string; upi?: string; gstin?: string }; txn: any; items: any[]; party: string; partyHi?: string | null; prevBalance: number | null; lang?: Lang; }
const L = {
  en: { SALE: 'SALE RECEIPT / PARCHI', PURCHASE: 'PURCHASE / PATTI', RECEIPT: 'DEPOSIT SLIP', PAYMENT: 'PAYMENT VOUCHER', no: 'Bill No.', date: 'Date', party: 'Party', sno: 'S.No.', item: 'Item / Maal', qty: 'Qty', rate: 'Rate (₹)', amt: 'Amount (₹)', gross: 'Gross', com: 'Commission', del: 'Delivery', cur: 'Current Bill', net: 'Net payable', prev: 'Previous Balance', total: 'Total Balance', remain: 'Remaining Balance', dr: 'DR', cr: 'CR', thanks: 'Thank you! Visit Again 🙏', sign: 'Signature', amount: 'Amount', mode: 'Mode', upi: 'Pay via UPI', narr: 'Narration' },
  hi: { SALE: 'बिक्री रसीद / परची', PURCHASE: 'खरीद / पट्टी', RECEIPT: 'जमा रसीद', PAYMENT: 'भुगतान वाउचर', no: 'बिल नं.', date: 'दिनांक', party: 'पार्टी', sno: 'क्र.सं.', item: 'माल / वस्तु', qty: 'मात्रा', rate: 'भाव (₹)', amt: 'रकम (₹)', gross: 'कुल माल', com: 'कमीशन/आढ़त', del: 'मज़दूरी/भाड़ा', cur: 'इस बिल की रकम', net: 'देय रकम', prev: 'पिछला बकाया', total: 'कुल बकाया', remain: 'शेष बकाया', dr: 'जमा लेना', cr: 'जमा देना', thanks: 'धन्यवाद! पुनः पधारें 🙏', sign: 'हस्ताक्षर', amount: 'रकम', mode: 'तरीका', upi: 'UPI से भुगतान', narr: 'विवरण' },
};
const bal = (p: number, l: Lang) => (p === 0 ? '₹0' : `${formatINR(Math.abs(p))} ${p > 0 ? L[l].dr : L[l].cr}`);
const closingOf = (t: any, prev: number) => (t.type === 'RECEIPT' ? prev - t.total_paise : t.type === 'PAYMENT' ? prev + t.total_paise : prev + (t.type === 'PURCHASE' ? -1 : 1) * t.total_paise);
const totals = (items: any[]) => ({ com: items.reduce((s, i) => s + i.commission_paise, 0), del: items.reduce((s, i) => s + i.delivery_paise, 0), gross: items.reduce((s, i) => s + i.gross_paise, 0) });

export function slipHtml(d: SlipData): string {
  const lang = d.lang ?? 'en', l = L[lang], t = d.txn, isBill = t.type === 'SALE' || t.type === 'PURCHASE';
  const add = t.type === 'SALE' || (t.type === 'PURCHASE' && Math.abs(t.total_paise - totals(d.items).gross) === totals(d.items).com + totals(d.items).del && t.total_paise >= totals(d.items).gross);
  const sg = add ? '+' : '-';
  const rows = d.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(lang === 'hi' && i.item_name_hi ? i.item_name_hi : i.item_name)}</td><td>${i.qty} ${esc(i.unit)}</td><td>${formatINR(i.rate_paise)}</td><td class="r">${formatINR(i.gross_paise)}</td></tr>`).join('');
  const { com, del, gross } = totals(d.items);
  const prev = d.prevBalance ?? 0, closing = closingOf(t, prev);
  const name = lang === 'hi' && d.shop.nameHi ? d.shop.nameHi : d.shop.name;
  return `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:14px;color:#111;padding:16px}h1{font-size:20px;margin:0;color:#15803D}table{width:100%;border-collapse:collapse}td,th{padding:6px 4px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}.b{font-weight:700}.box{border:1px solid #ccc;border-radius:8px;padding:8px;margin-top:10px}</style></head><body>
<h1>${esc(name || 'Mandi Khata')}</h1><div>${esc(d.shop.address)} ${d.shop.phone ? '📞 ' + esc(d.shop.phone) : ''}${d.shop.gstin ? ' · GSTIN ' + esc(d.shop.gstin) : ''}</div><hr/>
<div class="b">${l[t.type as 'SALE'] ?? t.type}</div><div>${l.no}: ${esc(t.voucher_no)} · ${l.date}: ${esc(t.date)}</div><div>${l.party}: <b>${esc(d.party)}</b>${d.partyHi ? ' (' + esc(d.partyHi) + ')' : ''}</div>
${isBill ? `<table><tr><th>${l.sno}</th><th>${l.item}</th><th>${l.qty}</th><th>${l.rate}</th><th class="r">${l.amt}</th></tr>${rows}</table>
<table><tr><td>${l.gross}</td><td class="r">${formatINR(gross)}</td></tr>${com ? `<tr><td>${l.com}</td><td class="r">${sg}${formatINR(com)}</td></tr>` : ''}${del ? `<tr><td>${l.del}</td><td class="r">${sg}${formatINR(del)}</td></tr>` : ''}<tr class="b"><td>${t.type === 'PURCHASE' ? l.net : l.cur}</td><td class="r">${formatINR(t.total_paise)}</td></tr></table>`
  : `<div class="box b">${l.amount}: ${formatINR(t.total_paise)} (${esc(t.mode)}${t.bank_name ? ' · ' + esc(t.bank_name) : ''}${t.cheque_no ? ' · #' + esc(t.cheque_no) : ''}${t.ref_no ? ' · ' + esc(t.ref_no) : ''})</div>`}
${t.narration ? `<div style="margin-top:6px">${l.narr}: ${esc(t.narration)}</div>` : ''}
<div class="box"><div>${l.prev}: ${bal(prev, lang)}</div><div class="b">${t.type === 'RECEIPT' || t.type === 'PAYMENT' ? l.remain : l.total}: ${bal(closing, lang)}</div></div>
<div style="margin-top:8px;font-size:12px">${esc(amountInWords(t.total_paise))}</div>
${d.shop.upi ? `<div style="margin-top:8px;font-size:12px">${l.upi}: ${esc(d.shop.upi)}</div>` : ''}
<div style="margin-top:28px;display:flex;justify-content:space-between;font-size:12px"><span>${l.thanks}</span><span>${l.sign}</span></div></body></html>`;
}
/** WhatsApp-formatted slip text (same layout as the original MandiMart message). */
export function whatsappMessage(d: SlipData): string {
  const lang = d.lang ?? 'en', l = L[lang], t = d.txn, isBill = t.type === 'SALE' || t.type === 'PURCHASE';
  const { com, del, gross } = totals(d.items); const prev = d.prevBalance ?? 0, closing = closingOf(t, prev); const line = '━━━━━━━━━━━━━━━━━━━━━';
  let m = `🏪 *${(d.shop.name || 'Mandi Khata').toUpperCase()}*\n`; if (d.shop.phone) m += `📞 ${d.shop.phone}\n`;
  m += `${line}\n📄 *${l[t.type as 'SALE'] ?? t.type}*\n🔢 *${l.no}:* ${t.voucher_no}\n📅 *${l.date}:* ${t.date}\n👤 *${l.party}:* ${d.party}${d.partyHi ? ` (${d.partyHi})` : ''}\n${line}\n`;
  if (isBill) {
    d.items.forEach((i, n) => { m += `${n + 1}. *${i.item_name}*\n   • ${i.qty} ${i.unit} @ ₹${(i.rate_paise / 100).toFixed(2)} = ₹${(i.gross_paise / 100).toFixed(2)}\n`; if (i.commission_paise || i.delivery_paise) m += `   • ${[i.commission_paise ? `${l.com}: ₹${(i.commission_paise / 100).toFixed(2)}` : '', i.delivery_paise ? `${l.del}: ₹${(i.delivery_paise / 100).toFixed(2)}` : ''].filter(Boolean).join(' | ')}\n`; });
    m += `${line}\n• ${l.gross}: ${formatINR(gross)}\n`; if (com) m += `• ${l.com}: ${formatINR(com)}\n`; if (del) m += `• ${l.del}: ${formatINR(del)}\n`;
    m += `🧾 *${t.type === 'PURCHASE' ? l.net : l.cur}: ${formatINR(t.total_paise)}*\n`;
  } else m += `💰 *${l.amount}: ${formatINR(t.total_paise)}* (${t.mode})\n`;
  m += `⏮️ *${l.prev}:* ${bal(prev, lang)}\n${line}\n🔴 *${l.total}:* *${bal(closing, lang)}*\n${line}\n🙏 ${l.thanks}`;
  return m;
}
export function statementHtml(shop: string, party: string, from: string, to: string, ledger: { opening: number; rows: any[]; closing: number }): string {
  const r = ledger.rows.map((x) => `<tr><td>${esc(x.date)}</td><td>${esc(x.voucher_no)}</td><td class="r">${x.dr ? formatINR(x.dr) : ''}</td><td class="r">${x.cr ? formatINR(x.cr) : ''}</td><td class="r">${formatINR(Math.abs(x.balance))} ${x.balance >= 0 ? 'Dr' : 'Cr'}</td></tr>`).join('');
  return `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:13px;padding:16px}table{width:100%;border-collapse:collapse}td,th{padding:5px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}</style></head><body><h2>${esc(shop)}</h2><div>Statement: <b>${esc(party)}</b> · ${esc(from)} to ${esc(to)}</div><p>Opening: ${formatINR(Math.abs(ledger.opening))} ${ledger.opening >= 0 ? 'Dr' : 'Cr'}</p><table><tr><th>Date</th><th>Vch</th><th class="r">Debit</th><th class="r">Credit</th><th class="r">Balance</th></tr>${r}</table><p><b>Closing: ${formatINR(Math.abs(ledger.closing))} ${ledger.closing >= 0 ? 'Dr' : 'Cr'}</b></p></body></html>`;
}
export const reminderText = (name: string, balance: number, shop: string, upi?: string, hi = true) =>
  hi ? `नमस्ते ${name} जी, ${shop} की ओर से: आपका बकाया ${formatINR(balance, { decimals: false })} है। कृपया जल्द भुगतान करें।${upi ? ` UPI: ${upi}` : ''} धन्यवाद 🙏`
     : `Hello ${name}, your outstanding balance with ${shop} is ${formatINR(balance, { decimals: false })}. Please pay soon.${upi ? ` UPI: ${upi}` : ''} Thank you.`;
export const waLink = (phone: string | null | undefined, text: string) => `https://wa.me/${phone ? (phone.length === 10 ? '91' + phone : phone) : ''}?text=${encodeURIComponent(text)}`;
