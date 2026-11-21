import { amountInWords, formatINR } from '@mandimart/shared';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export interface SlipData { shop: { name: string; address?: string; phone?: string; upi?: string }; txn: any; items: any[]; party: string; prevBalance: number | null; }

export function slipHtml(d: SlipData): string {
  const t = d.txn, isBill = t.type === 'SALE' || t.type === 'PURCHASE';
  const sign = t.type === 'PURCHASE' ? -1 : 1;
  const rows = d.items.map((i) => `<tr><td>${esc(i.item_name)}</td><td>${i.qty} ${esc(i.unit)}</td><td>${formatINR(i.rate_paise)}</td><td align="right">${formatINR(i.gross_paise)}</td></tr>`).join('');
  const com = d.items.reduce((s, i) => s + i.commission_paise, 0), del = d.items.reduce((s, i) => s + i.delivery_paise, 0), gross = d.items.reduce((s, i) => s + i.gross_paise, 0);
  const prev = d.prevBalance ?? 0;
  const closing = t.type === 'RECEIPT' ? prev - t.total_paise : t.type === 'PAYMENT' ? prev + t.total_paise : prev + sign * t.total_paise;
  const title = t.type === 'PURCHASE' ? 'PATTI / PURCHASE' : t.type === 'SALE' ? 'SALE BILL' : t.type === 'RECEIPT' ? 'RECEIPT' : t.type === 'PAYMENT' ? 'PAYMENT VOUCHER' : t.type;
  return `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:14px;color:#111;padding:16px}h1{font-size:20px;margin:0;color:#15803D}table{width:100%;border-collapse:collapse}td,th{padding:6px 4px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}.b{font-weight:700}.box{border:1px solid #ccc;border-radius:8px;padding:8px;margin-top:10px}</style></head><body>
<h1>${esc(d.shop.name || 'Mandi Khata')}</h1><div>${esc(d.shop.address)} ${esc(d.shop.phone)}</div><hr/>
<div class="b">${title} — ${esc(t.voucher_no)}</div><div>Date: ${esc(t.date)} · Party: ${esc(d.party)}</div>
${isBill ? `<table><tr><th>Item</th><th>Qty</th><th>Rate</th><th class="r">Amount</th></tr>${rows}</table>
<table><tr><td>Gross</td><td class="r">${formatINR(gross)}</td></tr><tr><td>Commission</td><td class="r">${t.type === 'PURCHASE' ? '-' : '+'}${formatINR(com)}</td></tr><tr><td>Delivery / Hamali</td><td class="r">${t.type === 'PURCHASE' ? '-' : '+'}${formatINR(del)}</td></tr><tr class="b"><td>${t.type === 'PURCHASE' ? 'Net payable' : 'Bill total'}</td><td class="r">${formatINR(t.total_paise)}</td></tr></table>`
  : `<div class="box b">Amount: ${formatINR(t.total_paise)} (${esc(t.mode)}${t.ref_no ? ' · ' + esc(t.ref_no) : ''})</div>`}
<div class="box"><div>Previous balance: ${formatINR(Math.abs(prev))} ${prev >= 0 ? 'Dr' : 'Cr'}</div><div class="b">Total balance: ${formatINR(Math.abs(closing))} ${closing >= 0 ? 'Dr' : 'Cr'}</div></div>
<div style="margin-top:8px;font-size:12px">${esc(amountInWords(t.total_paise))}</div>
${d.shop.upi ? `<div style="margin-top:8px;font-size:12px">Pay via UPI: ${esc(d.shop.upi)}</div>` : ''}</body></html>`;
}
export function statementHtml(shop: string, party: string, from: string, to: string, ledger: { opening: number; rows: any[]; closing: number }): string {
  const r = ledger.rows.map((x) => `<tr><td>${esc(x.date)}</td><td>${esc(x.voucher_no)}</td><td class="r">${x.dr ? formatINR(x.dr) : ''}</td><td class="r">${x.cr ? formatINR(x.cr) : ''}</td><td class="r">${formatINR(Math.abs(x.balance))} ${x.balance >= 0 ? 'Dr' : 'Cr'}</td></tr>`).join('');
  return `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:13px;padding:16px}table{width:100%;border-collapse:collapse}td,th{padding:5px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}</style></head><body><h2>${esc(shop)}</h2><div>Statement: <b>${esc(party)}</b> · ${esc(from)} to ${esc(to)}</div><p>Opening: ${formatINR(Math.abs(ledger.opening))} ${ledger.opening >= 0 ? 'Dr' : 'Cr'}</p><table><tr><th>Date</th><th>Vch</th><th class="r">Debit</th><th class="r">Credit</th><th class="r">Balance</th></tr>${r}</table><p><b>Closing: ${formatINR(Math.abs(ledger.closing))} ${ledger.closing >= 0 ? 'Dr' : 'Cr'}</b></p></body></html>`;
}
export const reminderText = (name: string, balance: number, shop: string, upi?: string, hi = true) =>
  hi ? `नमस्ते ${name} जी, ${shop} की ओर से: आपका बकाया ${formatINR(balance, { decimals: false })} है। कृपया जल्द भुगतान करें।${upi ? ` UPI: ${upi}` : ''} धन्यवाद 🙏`
     : `Hello ${name}, your outstanding balance with ${shop} is ${formatINR(balance, { decimals: false })}. Please pay soon.${upi ? ` UPI: ${upi}` : ''} Thank you.`;
export const waLink = (phone: string | null | undefined, text: string) => `https://wa.me/${phone ? (phone.length === 10 ? '91' + phone : phone) : ''}?text=${encodeURIComponent(text)}`;
