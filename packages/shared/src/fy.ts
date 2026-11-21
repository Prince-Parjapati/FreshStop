/** Indian financial year (Apr–Mar). fyStartMonth is 1-12, default 4. */
export function financialYear(date: Date, fyStartMonth = 4): { start: Date; end: Date; label: string; short: string } {
  const m = date.getMonth() + 1;
  const startYear = m >= fyStartMonth ? date.getFullYear() : date.getFullYear() - 1;
  const start = new Date(startYear, fyStartMonth - 1, 1);
  const end = new Date(startYear + 1, fyStartMonth - 1, 0);
  const a = String(startYear), b = String(startYear + 1);
  return { start, end, label: `${a}-${b}`, short: a.slice(2) + b.slice(2) };
}
const PREFIX: Record<string, string> = { SALE: 'S', PURCHASE: 'P', RECEIPT: 'R', PAYMENT: 'PM', JOURNAL: 'J', CONTRA: 'C', EXPENSE: 'E' };
export function voucherNo(type: string, fyShort: string, seq: number, prefix?: string): string {
  return `${prefix ?? PREFIX[type] ?? 'V'}-${fyShort}-${String(seq).padStart(4, '0')}`;
}
