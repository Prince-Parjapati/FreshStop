/** Indian financial year (Apr–Mar). fyStartMonth is 1-12, default 4. */
export function financialYear(date: Date, fyStartMonth = 4): { start: Date; end: Date; label: string; short: string } {
  const m = date.getMonth() + 1;
  const startYear = m >= fyStartMonth ? date.getFullYear() : date.getFullYear() - 1;
  const start = new Date(startYear, fyStartMonth - 1, 1);
  const end = new Date(startYear + 1, fyStartMonth - 1, 0);
  const a = String(startYear), b = String(startYear + 1);
  return { start, end, label: `${a}-${b}`, short: a.slice(2) + b.slice(2) };
}
export const VOUCHER_PREFIX: Record<string, string> = { SALE: 'SL', PURCHASE: 'PU', RECEIPT: 'RC', PAYMENT: 'PY', JOURNAL: 'JV', CONTRA: 'CT', EXPENSE: 'EX' };
/** Same format as the original MandiMart: SL-2025-00001 (FY start year, 5-digit sequence). */
export function voucherNo(type: string, fyStartYear: number, seq: number, prefix?: string): string {
  return `${prefix ?? VOUCHER_PREFIX[type] ?? 'VC'}-${fyStartYear}-${String(seq).padStart(5, '0')}`;
}
