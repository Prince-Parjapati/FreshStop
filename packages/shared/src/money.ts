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
export type PurchaseMode = 'ADD' | 'DEDUCT';
/**
 * Purchase from supplier. ADD (default, as in the original MandiMart): payable = gross + commission + delivery.
 * DEDUCT (farmer patti): payable = gross - commission - delivery.
 */
export function purchaseNet({ gross, commissionPct, delivery }: BillInput, mode: PurchaseMode = 'ADD'): Paise {
  const c = commissionPaise(gross, commissionPct);
  return mode === 'ADD' ? gross + c + delivery : gross - c - delivery;
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

/**
 * Calculator-style field evaluation ("10+20", "5*10", "50/2"). Trailing operators are ignored while typing.
 * Safe: only digits and + - * / ( ) . are accepted and evaluated by a tiny parser (no eval).
 */
export function evaluateMath(expr: string | number | null | undefined): number {
  if (expr === null || expr === undefined) return 0;
  if (typeof expr === 'number') return Number.isFinite(expr) ? expr : 0;
  const cleaned = expr.replace(/[^0-9.+\-*/()]/g, '').replace(/[+\-*/]+$/, '');
  if (!cleaned) return 0;
  let i = 0;
  const peek = () => cleaned[i];
  const num = (): number => {
    if (peek() === '(') { i++; const v = add(); if (peek() === ')') i++; return v; }
    if (peek() === '-') { i++; return -num(); }
    let j = i; while (j < cleaned.length && /[0-9.]/.test(cleaned[j]!)) j++;
    const v = parseFloat(cleaned.slice(i, j)); i = j; return Number.isFinite(v) ? v : 0;
  };
  const mul = (): number => { let v = num(); while (peek() === '*' || peek() === '/') { const o = cleaned[i++]; const r = num(); v = o === '*' ? v * r : r === 0 ? 0 : v / r; } return v; };
  const add = (): number => { let v = mul(); while (peek() === '+' || peek() === '-') { const o = cleaned[i++]; const r = mul(); v = o === '+' ? v + r : v - r; } return v; };
  const out = add();
  return Number.isFinite(out) ? Math.round(out * 1000) / 1000 : 0;
}
/** Original-app commission expression: "50+20" means successive percentages (50% then 20% => 60%). Plain "5" is 5%. */
export function evaluateCommissionRate(str: string): number {
  if (!str) return 0;
  const parts = str.split('+').map((p) => parseFloat(p.replace(/[^0-9.]/g, ''))).filter((n) => !isNaN(n) && n > 0);
  if (!parts.length) return 0;
  if (parts.length === 1) return parts[0]!;
  const remaining = parts.reduce((r, p) => r * (1 - p / 100), 1);
  return Math.round((1 - remaining) * 10000) / 100;
}
