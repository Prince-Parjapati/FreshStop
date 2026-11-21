import { financialYear, voucherNo, saleNet, purchaseNet, commissionPaise, grossPaise } from '@mandimart/shared';
import type { Db } from './types';

export const uid = (): string => {
  // time-sortable id (ULID-ish); not cryptographic
  const t = Date.now().toString(36).padStart(9, '0');
  let r = ''; for (let i = 0; i < 12; i++) r += Math.floor(Math.random() * 36).toString(36);
  return t + r;
};
export type AccType = 'CUSTOMER' | 'SUPPLIER' | 'CASH' | 'BANK' | 'SALES' | 'PURCHASE' | 'COMMISSION' | 'DELIVERY' | 'EXPENSE' | 'OTHER';
export interface BillLine { itemId?: string; itemName: string; qty: number; unit: string; ratePaise: number; commissionPct: number; deliveryPaise: number; }
const SYSTEM: [string, AccType][] = [['Cash', 'CASH'], ['Bank', 'BANK'], ['Sales', 'SALES'], ['Purchases', 'PURCHASE'], ['Commission Income', 'COMMISSION'], ['Delivery Charges', 'DELIVERY'], ['General Expenses', 'EXPENSE']];

export class Repo {
  constructor(private db: Db, private deviceId = 'local') {}
  now = () => Date.now();

  async seedSystemAccounts() {
    for (const [name, type] of SYSTEM) {
      const e = await this.db.all('SELECT id FROM accounts WHERE is_system=1 AND type=? AND name=?', [type, name]);
      if (!e.length) await this.db.run('INSERT INTO accounts(id,name,type,is_system,updated_at,device_id) VALUES (?,?,?,1,?,?)', [uid(), name, type, this.now(), this.deviceId]);
    }
  }
  private async sys(type: AccType, name?: string): Promise<string> {
    const r = await this.db.all<{ id: string }>('SELECT id FROM accounts WHERE is_system=1 AND type=? AND deleted_at IS NULL' + (name ? ' AND name=?' : '') + ' ORDER BY name LIMIT 1', name ? [type, name] : [type]);
    if (!r[0]) throw new Error('System account missing: ' + type);
    return r[0].id;
  }
  async addAccount(a: { name: string; nameHi?: string; type: 'CUSTOMER' | 'SUPPLIER'; phone?: string; openingPaise?: number; commissionPct?: number; creditDays?: number }) {
    const id = uid();
    await this.db.run('INSERT INTO accounts(id,name,name_hi,type,phone,opening_paise,default_commission_pct,credit_days,updated_at,device_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, a.name.trim().replace(/\s+/g, ' '), a.nameHi ?? null, a.type, a.phone ?? null, a.openingPaise ?? 0, a.commissionPct ?? 0, a.creditDays ?? null, this.now(), this.deviceId]);
    return id;
  }
  async addItem(i: { name: string; nameHi?: string; unit?: string; ratePaise?: number }) {
    const id = uid();
    await this.db.run('INSERT INTO items(id,name,name_hi,unit,default_rate_paise,updated_at,device_id) VALUES (?,?,?,?,?,?,?)', [id, i.name.trim(), i.nameHi ?? null, i.unit ?? 'KG', i.ratePaise ?? 0, this.now(), this.deviceId]);
    return id;
  }

  /** Balance of a ledger account: opening + Σ(debit − credit). Positive = Dr (receivable for customers). */
  async balance(accountId: string, upToDate?: string): Promise<number> {
    const r = await this.db.all<{ b: number }>(
      `SELECT a.opening_paise + COALESCE((SELECT SUM(l.debit_paise - l.credit_paise) FROM transaction_lines l JOIN transactions t ON t.id=l.txn_id
         WHERE l.account_id=a.id AND t.deleted_at IS NULL ${upToDate ? 'AND t.date <= ?' : ''}),0) AS b FROM accounts a WHERE a.id=?`,
      upToDate ? [upToDate, accountId] : [accountId]);
    return r[0]?.b ?? 0;
  }

  private async nextVoucher(type: string, date: string): Promise<string> {
    const co = await this.db.all<{ fy_start_month: number; voucher_prefix: string | null }>('SELECT fy_start_month, voucher_prefix FROM company WHERE id=1');
    const fy = financialYear(new Date(date + 'T00:00:00'), co[0]?.fy_start_month ?? 4);
    const key = `${type}:${fy.short}`;
    await this.db.run('INSERT INTO counters(key,value) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET value=value+1', [key]);
    const r = await this.db.all<{ value: number }>('SELECT value FROM counters WHERE key=?', [key]);
    return voucherNo(type, fy.short, r[0]!.value, co[0]?.voucher_prefix ? co[0].voucher_prefix + '-' + type[0] : undefined);
  }

  private async post(t: { id: string; type: string; date: string; partyId?: string | null; narration?: string; total: number; prevBal?: number; mode?: string; refNo?: string; chequeDate?: string; cleared?: boolean },
    lines: { account: string; dr?: number; cr?: number }[], bills: BillLine[] = [], calc: ReturnType<typeof calcLine>[] = []) {
    const dr = lines.reduce((s, l) => s + (l.dr ?? 0), 0), cr = lines.reduce((s, l) => s + (l.cr ?? 0), 0);
    if (dr !== cr) throw new Error(`Unbalanced entry: Dr ${dr} != Cr ${cr}`);
    const vno = await this.nextVoucher(t.type, t.date);
    await this.db.run('INSERT INTO transactions(id,type,voucher_no,date,party_id,narration,total_paise,prev_balance_paise,mode,ref_no,cheque_date,cleared,updated_at,device_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [t.id, t.type, vno, t.date, t.partyId ?? null, t.narration ?? null, t.total, t.prevBal ?? null, t.mode ?? null, t.refNo ?? null, t.chequeDate ?? null, t.cleared === false ? 0 : 1, this.now(), this.deviceId]);
    for (const l of lines) if ((l.dr ?? 0) || (l.cr ?? 0))
      await this.db.run('INSERT INTO transaction_lines(id,txn_id,account_id,debit_paise,credit_paise) VALUES (?,?,?,?,?)', [uid(), t.id, l.account, l.dr ?? 0, l.cr ?? 0]);
    for (let i = 0; i < bills.length; i++) {
      const b = bills[i]!, c = calc[i]!;
      await this.db.run('INSERT INTO bill_items(id,txn_id,item_id,item_name,qty,unit,rate_paise,gross_paise,commission_pct,commission_paise,delivery_paise,net_paise) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [uid(), t.id, b.itemId ?? null, b.itemName, b.qty, b.unit, b.ratePaise, c.gross, b.commissionPct, c.commission, b.deliveryPaise, c.net]);
    }
    return { id: t.id, voucherNo: vno };
  }

  /** SALE: Dr party(net) / Cr Sales(gross) / Cr Commission / Cr Delivery */
  async createSale(p: { partyId: string; date: string; lines: BillLine[]; narration?: string }) {
    return this.createBill('SALE', p);
  }
  /** PURCHASE (farmer): Dr Purchases(gross) / Cr party(net) / Cr Commission(+recovery) / Cr Delivery */
  async createPurchase(p: { partyId: string; date: string; lines: BillLine[]; narration?: string }) {
    return this.createBill('PURCHASE', p);
  }
  private async createBill(type: 'SALE' | 'PURCHASE', p: { partyId: string; date: string; lines: BillLine[]; narration?: string }) {
    if (!p.lines.length) throw new Error('No items');
    const calc = p.lines.map((l) => calcLine(type, l));
    const gross = calc.reduce((s, c) => s + c.gross, 0), com = calc.reduce((s, c) => s + c.commission, 0);
    const del = p.lines.reduce((s, l) => s + l.deliveryPaise, 0), net = calc.reduce((s, c) => s + c.net, 0);
    return this.db.tx(async () => {
      const prev = await this.balance(p.partyId);
      const id = uid();
      const lines = type === 'SALE'
        ? [{ account: p.partyId, dr: net }, { account: await this.sys('SALES'), cr: gross }, { account: await this.sys('COMMISSION'), cr: com }, { account: await this.sys('DELIVERY'), cr: del }]
        : [{ account: await this.sys('PURCHASE'), dr: gross }, { account: p.partyId, cr: net }, { account: await this.sys('COMMISSION'), cr: com }, { account: await this.sys('DELIVERY'), cr: del }];
      return this.post({ id, type, date: p.date, partyId: p.partyId, narration: p.narration, total: net, prevBal: prev }, lines, p.lines, calc);
    });
  }
  /** RECEIPT: Dr Cash/Bank / Cr party. PAYMENT: Dr party / Cr Cash/Bank. */
  async createCashVoucher(p: { kind: 'RECEIPT' | 'PAYMENT'; partyId: string; date: string; amountPaise: number; mode: 'CASH' | 'BANK' | 'CHEQUE' | 'UPI' | 'NEFT'; refNo?: string; chequeDate?: string; cleared?: boolean; narration?: string }) {
    if (p.amountPaise <= 0) throw new Error('Amount must be positive');
    return this.db.tx(async () => {
      const prev = await this.balance(p.partyId);
      const cash = await this.sys(p.mode === 'CASH' ? 'CASH' : 'BANK');
      const lines = p.kind === 'RECEIPT' ? [{ account: cash, dr: p.amountPaise }, { account: p.partyId, cr: p.amountPaise }] : [{ account: p.partyId, dr: p.amountPaise }, { account: cash, cr: p.amountPaise }];
      return this.post({ id: uid(), type: p.kind, date: p.date, partyId: p.partyId, total: p.amountPaise, prevBal: prev, mode: p.mode, refNo: p.refNo, chequeDate: p.chequeDate, cleared: p.cleared, narration: p.narration }, lines);
    });
  }
  /** Kharcha: Dr Expense / Cr Cash. */
  async createExpense(p: { date: string; amountPaise: number; category: string; mode?: 'CASH' | 'BANK' }) {
    return this.db.tx(async () => this.post({ id: uid(), type: 'EXPENSE', date: p.date, total: p.amountPaise, narration: p.category, mode: p.mode ?? 'CASH' },
      [{ account: await this.sys('EXPENSE'), dr: p.amountPaise }, { account: await this.sys(p.mode === 'BANK' ? 'BANK' : 'CASH'), cr: p.amountPaise }]));
  }

  async softDelete(txnId: string) { await this.db.run('UPDATE transactions SET deleted_at=?, updated_at=? WHERE id=? AND deleted_at IS NULL', [this.now(), this.now(), txnId]); }
  async restore(txnId: string) { await this.db.run('UPDATE transactions SET deleted_at=NULL, updated_at=? WHERE id=?', [this.now(), txnId]); }
  async purgeDeleted(olderThanDays = 30) {
    const cutoff = this.now() - olderThanDays * 86400000;
    await this.db.run('DELETE FROM transactions WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoff]);
  }

  /** Ledger with running balance for an account. */
  async ledger(accountId: string, from?: string, to?: string) {
    const open = from ? await this.balance(accountId, prevDay(from)) : (await this.db.all<{ o: number }>('SELECT opening_paise o FROM accounts WHERE id=?', [accountId]))[0]?.o ?? 0;
    const rows = await this.db.all<any>(
      `SELECT t.id, t.date, t.type, t.voucher_no, t.narration, l.debit_paise dr, l.credit_paise cr FROM transaction_lines l JOIN transactions t ON t.id=l.txn_id
       WHERE l.account_id=? AND t.deleted_at IS NULL ${from ? 'AND t.date>=?' : ''} ${to ? 'AND t.date<=?' : ''} ORDER BY t.date, t.voucher_no`,
      [accountId, ...(from ? [from] : []), ...(to ? [to] : [])]);
    let run = open;
    return { opening: open, rows: rows.map((r) => ({ ...r, balance: (run += r.dr - r.cr) })), closing: run };
  }

  async dashboard(today: string) {
    const sum = async (type: string, d?: string) => (await this.db.all<{ s: number }>(`SELECT COALESCE(SUM(total_paise),0) s FROM transactions WHERE type=? AND deleted_at IS NULL ${d ? 'AND date=?' : ''}`, d ? [type, d] : [type]))[0]!.s;
    const byType = async (t: AccType) => (await this.db.all<{ b: number }>('SELECT COALESCE(SUM(id_bal),0) b FROM (SELECT a.opening_paise + COALESCE((SELECT SUM(l.debit_paise-l.credit_paise) FROM transaction_lines l JOIN transactions x ON x.id=l.txn_id WHERE l.account_id=a.id AND x.deleted_at IS NULL),0) id_bal FROM accounts a WHERE a.type=? AND a.deleted_at IS NULL)', [t]))[0]!.b;
    const cash = await byType('CASH'), bank = await byType('BANK');
    const cust = await this.db.all<{ b: number }>('SELECT a.opening_paise + COALESCE((SELECT SUM(l.debit_paise-l.credit_paise) FROM transaction_lines l JOIN transactions x ON x.id=l.txn_id WHERE l.account_id=a.id AND x.deleted_at IS NULL),0) b FROM accounts a WHERE a.type=\'CUSTOMER\' AND a.deleted_at IS NULL');
    const sup = await this.db.all<{ b: number }>('SELECT a.opening_paise + COALESCE((SELECT SUM(l.debit_paise-l.credit_paise) FROM transaction_lines l JOIN transactions x ON x.id=l.txn_id WHERE l.account_id=a.id AND x.deleted_at IS NULL),0) b FROM accounts a WHERE a.type=\'SUPPLIER\' AND a.deleted_at IS NULL');
    return {
      todaySales: await sum('SALE', today), todayReceipts: await sum('RECEIPT', today), todayPayments: await sum('PAYMENT', today), todayPurchases: await sum('PURCHASE', today),
      receivables: cust.reduce((s, r) => s + Math.max(r.b, 0), 0) + sup.reduce((s, r) => s + Math.max(r.b, 0), 0),
      payables: sup.reduce((s, r) => s + Math.max(-r.b, 0), 0) + cust.reduce((s, r) => s + Math.max(-r.b, 0), 0),
      cashBalance: cash + bank,
    };
  }

  /** Outstanding receivables with aging buckets via FIFO: payments clear oldest invoices first. */
  async outstanding(asOf: string) {
    const parties = await this.db.all<{ id: string; name: string; opening_paise: number; phone: string | null }>("SELECT id,name,opening_paise,phone FROM accounts WHERE type='CUSTOMER' AND deleted_at IS NULL");
    const out = [];
    for (const p of parties) {
      const rows = await this.db.all<{ date: string; dr: number; cr: number }>(
        `SELECT t.date, l.debit_paise dr, l.credit_paise cr FROM transaction_lines l JOIN transactions t ON t.id=l.txn_id WHERE l.account_id=? AND t.deleted_at IS NULL AND t.date<=? ORDER BY t.date, t.rowid`, [p.id, asOf]);
      const bills: { date: string; amt: number }[] = [];
      if (p.opening_paise > 0) bills.push({ date: '0000-00-00', amt: p.opening_paise });
      let credit = p.opening_paise < 0 ? -p.opening_paise : 0;
      for (const r of rows) { if (r.dr) bills.push({ date: r.date, amt: r.dr }); credit += r.cr; }
      for (const b of bills) { const use = Math.min(b.amt, credit); b.amt -= use; credit -= use; }
      const bk = { b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0 };
      for (const b of bills) {
        if (b.amt <= 0) continue;
        const age = b.date === '0000-00-00' ? 9999 : Math.floor((Date.parse(asOf) - Date.parse(b.date)) / 86400000);
        if (age <= 30) bk.b0_30 += b.amt; else if (age <= 60) bk.b31_60 += b.amt; else if (age <= 90) bk.b61_90 += b.amt; else bk.b90p += b.amt;
      }
      const total = bk.b0_30 + bk.b31_60 + bk.b61_90 + bk.b90p;
      if (total > 0) out.push({ partyId: p.id, name: p.name, phone: p.phone, total, ...bk });
    }
    return out.sort((a, b) => b.total - a.total);
  }
}

function calcLine(type: 'SALE' | 'PURCHASE', l: BillLine) {
  const gross = grossPaise(l.qty, l.ratePaise);
  const commission = commissionPaise(gross, l.commissionPct);
  const b = { gross, commissionPct: l.commissionPct, delivery: l.deliveryPaise };
  return { gross, commission, net: type === 'SALE' ? saleNet(b) : purchaseNet(b) };
}
function prevDay(d: string) { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); }
