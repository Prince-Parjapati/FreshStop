/** All money is integer paise. */
export type Paise = number;

export const toPaise = (rupees: number | string): Paise => {
  const n = typeof rupees === 'string' ? Number(rupees.replace(/,/g, '').trim()) : rupees;
  if (!Number.isFinite(n)) throw new Error('Invalid amount');
  return Math.round(n * 100 + Number.EPSILON * Math.sign(n));
};
export const toRupees = (p: Paise): number => p / 100;

/** Indian grouping: 1,23,456.00 */
export function formatINR(p: Paise, opts: { symbol?: boolean; decimals?: boolean } = {}): string {
  const { symbol = true, decimals = true } = opts;
  const neg = p < 0;
  const abs = Math.abs(p);
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  const s = String(rupees);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  const out = decimals ? `${grouped}.${String(paise).padStart(2, '0')}` : grouped;
  return `${neg ? '-' : ''}${symbol ? '₹' : ''}${out}`;
}

/** gross = qty * rate (qty in thousandths allowed via float; rounded to paise) */
export const grossPaise = (qty: number, ratePaise: Paise): Paise => Math.round(qty * ratePaise);
/** commission percent may have 2 decimals, e.g. 6.25 */
export const commissionPaise = (gross: Paise, percent: number): Paise => Math.round((gross * percent) / 100);

export interface BillInput { gross: Paise; commissionPct: number; delivery: Paise; }
/** Sale (agent bills buyer): net = gross + commission + delivery. */
export function saleNet({ gross, commissionPct, delivery }: BillInput): Paise {
  return gross + commissionPaise(gross, commissionPct) + delivery;
}
/** Purchase (farmer settlement): net payable = gross - commission - delivery. */
export function purchaseNet({ gross, commissionPct, delivery }: BillInput): Paise {
  return gross - commissionPaise(gross, commissionPct) - delivery;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const below100 = (n: number) => (n < 20 ? ONES[n]! : TENS[Math.floor(n / 10)]! + (n % 10 ? ' ' + ONES[n % 10] : ''));
const below1000 = (n: number) => (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '') : below100(n));
/** Lakh/crore words for rupees portion. */
export function amountInWords(p: Paise): string {
  let r = Math.floor(Math.abs(p) / 100);
  if (r === 0) return 'Zero Rupees';
  const parts: string[] = [];
  const crore = Math.floor(r / 1e7); r %= 1e7;
  const lakh = Math.floor(r / 1e5); r %= 1e5;
  const thou = Math.floor(r / 1e3); r %= 1e3;
  if (crore) parts.push(below100(crore) + ' Crore');
  if (lakh) parts.push(below100(lakh) + ' Lakh');
  if (thou) parts.push(below100(thou) + ' Thousand');
  if (r) parts.push(below1000(r));
  const paise = Math.abs(p) % 100;
  return parts.join(' ') + ' Rupees' + (paise ? ' and ' + below100(paise) + ' Paise' : '') + ' Only';
}
