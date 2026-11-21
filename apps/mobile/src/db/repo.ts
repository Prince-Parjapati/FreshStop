import { financialYear, voucherNo, saleNet, purchaseNet, commissionPaise, grossPaise, type PurchaseMode } from '@mandimart/shared';
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
  private depth = 0;
  /** Re-entrant transaction: only the outermost call opens/commits. */
  private async atomic<T>(fn: () => Promise<T>): Promise<T> {
    if (this.depth > 0) return fn();
    this.depth++;
    try { return await this.db.tx(fn); } finally { this.depth--; }
  }

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
  async addAccount(a: AccountInput) {
    const id = uid();
    const n = normAccount(a);
    await this.db.run('INSERT INTO accounts(id,name,name_hi,type,phone,address,city,gstin,pan,bank_name,bank_account_no,bank_ifsc,opening_paise,default_commission_pct,credit_days,credit_limit_paise,updated_at,device_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, n.name, n.nameHi, a.type, n.phone, n.address, n.city, n.gstin, n.pan, n.bankName, n.bankAccountNo, n.bankIfsc, a.openingPaise ?? 0, a.commissionPct ?? 0, a.creditDays ?? null, a.creditLimitPaise ?? null, this.now(), this.deviceId]);
    return id;
  }
  async updateAccount(id: string, a: AccountInput) {
    const n = normAccount(a);
    await this.db.run('UPDATE accounts SET name=?,name_hi=?,type=?,phone=?,address=?,city=?,gstin=?,pan=?,bank_name=?,bank_account_no=?,bank_ifsc=?,opening_paise=?,default_commission_pct=?,credit_days=?,credit_limit_paise=?,updated_at=? WHERE id=? AND is_system=0',
      [n.name, n.nameHi, a.type, n.phone, n.address, n.city, n.gstin, n.pan, n.bankName, n.bankAccountNo, n.bankIfsc, a.openingPaise ?? 0, a.commissionPct ?? 0, a.creditDays ?? null, a.creditLimitPaise ?? null, this.now(), id]);
  }
  async getAccount(id: string) { return (await this.db.all<any>('SELECT * FROM accounts WHERE id=?', [id]))[0] ?? null; }
  /** Parties with live balance in one query. Search matches name, Hindi name and phone. */
  async listAccounts(opts: { type?: 'CUSTOMER' | 'SUPPLIER'; search?: string; deleted?: boolean } = {}) {
    const w = [opts.deleted ? 'a.deleted_at IS NOT NULL' : 'a.deleted_at IS NULL', opts.type ? 'a.type=?' : "a.type IN ('CUSTOMER','SUPPLIER')"]; const p: unknown[] = [];
    if (opts.type) p.push(opts.type);
    const q = (opts.search ?? '').trim().replace(/\s+/g, ' ');
    if (q) { w.push('(a.name LIKE ? OR a.name_hi LIKE ? OR a.phone LIKE ?)'); p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    return this.db.all<any>(`SELECT a.*, a.opening_paise + COALESCE((SELECT SUM(l.debit_paise-l.credit_paise) FROM transaction_lines l JOIN transactions t ON t.id=l.txn_id WHERE l.account_id=a.id AND t.deleted_at IS NULL),0) AS balance FROM accounts a WHERE ${w.join(' AND ')} ORDER BY a.name`, p);
  }
  /** Soft delete a party (kept 30 days in Recycle Bin, then purged if it has no entries). */
  async deleteAccount(id: string) { await this.db.run('UPDATE accounts SET deleted_at=?, updated_at=? WHERE id=? AND is_system=0', [this.now(), this.now(), id]); }
  async restoreAccount(id: string) { await this.db.run('UPDATE accounts SET deleted_at=NULL, updated_at=? WHERE id=?', [this.now(), id]); }
  async addItem(i: ItemInput) {
    const id = uid();
    await this.db.run('INSERT INTO items(id,name,name_hi,unit,default_rate_paise,hsn_code,gst_rate,category,updated_at,device_id) VALUES (?,?,?,?,?,?,?,?,?,?)', [id, i.name.trim(), i.nameHi ?? null, i.unit ?? 'KG', i.ratePaise ?? 0, i.hsn ?? null, i.gstRate ?? 0, i.category ?? null, this.now(), this.deviceId]);
    return id;
  }
  async updateItem(id: string, i: ItemInput) {
    await this.db.run('UPDATE items SET name=?,name_hi=?,unit=?,default_rate_paise=?,hsn_code=?,gst_rate=?,category=?,updated_at=? WHERE id=?', [i.name.trim(), i.nameHi ?? null, i.unit ?? 'KG', i.ratePaise ?? 0, i.hsn ?? null, i.gstRate ?? 0, i.category ?? null, this.now(), id]);
  }
  async getItem(id: string) { return (await this.db.all<any>('SELECT * FROM items WHERE id=?', [id]))[0] ?? null; }
  async restoreItem(id: string) { await this.db.run('UPDATE items SET deleted_at=NULL, updated_at=? WHERE id=?', [this.now(), id]); }
  async setItemRate(name: string, ratePaise: number) { await this.db.run('UPDATE items SET default_rate_paise=?, updated_at=? WHERE lower(name)=lower(?) AND deleted_at IS NULL', [ratePaise, this.now(), name]); }

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
    const key = `${type}:${fy.start.getFullYear()}`;
    await this.db.run('INSERT INTO counters(key,value) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET value=value+1', [key]);
    const r = await this.db.all<{ value: number }>('SELECT value FROM counters WHERE key=?', [key]);
    return voucherNo(type, fy.start.getFullYear(), r[0]!.value);
  }

  private async post(t: { id: string; type: string; date: string; partyId?: string | null; narration?: string; total: number; prevBal?: number; mode?: string; refNo?: string; chequeDate?: string; chequeNo?: string; bankName?: string; cleared?: boolean; vno?: string },
    lines: { account: string; dr?: number; cr?: number }[], bills: BillLine[] = [], calc: ReturnType<typeof calcLine>[] = []) {
    const dr = lines.reduce((s, l) => s + (l.dr ?? 0), 0), cr = lines.reduce((s, l) => s + (l.cr ?? 0), 0);
    if (dr !== cr) throw new Error(`Unbalanced entry: Dr ${dr} != Cr ${cr}`);
    const vno = t.vno ?? (await this.nextVoucher(t.type, t.date));
    await this.db.run('INSERT INTO transactions(id,type,voucher_no,date,party_id,narration,total_paise,prev_balance_paise,mode,ref_no,cheque_date,cheque_no,bank_name,cleared,updated_at,device_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [t.id, t.type, vno, t.date, t.partyId ?? null, t.narration ?? null, t.total, t.prevBal ?? null, t.mode ?? null, t.refNo ?? null, t.chequeDate ?? null, t.chequeNo ?? null, t.bankName ?? null, t.cleared === false ? 0 : 1, this.now(), this.deviceId]);
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
  /** Edit a bill in place: keeps voucher number, re-posts lines against current balance. */
  async editBill(txnId: string, p: { partyId: string; date: string; lines: BillLine[]; narration?: string }) {
    const old = (await this.db.all<any>('SELECT type FROM transactions WHERE id=? AND deleted_at IS NULL', [txnId]))[0];
    if (!old || (old.type !== 'SALE' && old.type !== 'PURCHASE')) throw new Error('Not an editable bill');
    return this.atomic(async () => {
      await this.db.run('DELETE FROM transaction_lines WHERE txn_id=?', [txnId]); await this.db.run('DELETE FROM bill_items WHERE txn_id=?', [txnId]);
      const vno = (await this.db.all<{ voucher_no: string }>('SELECT voucher_no FROM transactions WHERE id=?', [txnId]))[0]!.voucher_no;
      await this.db.run('DELETE FROM transactions WHERE id=?', [txnId]);
      const r = await this.createBill(old.type, p, txnId, vno);
      return r;
    });
  }
  async editCashVoucher(txnId: string, p: { partyId: string; date: string; amountPaise: number; mode: 'CASH' | 'BANK' | 'CHEQUE' | 'UPI' | 'NEFT'; refNo?: string; chequeDate?: string; chequeNo?: string; bankName?: string; narration?: string }) {
    const old = (await this.db.all<any>('SELECT type FROM transactions WHERE id=? AND deleted_at IS NULL', [txnId]))[0];
    if (!old || (old.type !== 'RECEIPT' && old.type !== 'PAYMENT')) throw new Error('Not an editable voucher');
    return this.atomic(async () => {
      const vno = (await this.db.all<{ voucher_no: string }>('SELECT voucher_no FROM transactions WHERE id=?', [txnId]))[0]!.voucher_no;
      await this.db.run('DELETE FROM transactions WHERE id=?', [txnId]); // lines cascade
      return this.createCashVoucher({ kind: old.type, ...p }, txnId, vno);
    });
  }
  private async createBill(type: 'SALE' | 'PURCHASE', p: { partyId: string; date: string; lines: BillLine[]; narration?: string }, reuseId?: string, reuseVno?: string) {
    if (!p.lines.length) throw new Error('No items');
    if (p.lines.some((l) => !(l.qty > 0) || l.ratePaise < 0)) throw new Error('Invalid qty or rate');
    const mode = ((await this.company())?.purchase_mode ?? 'ADD') as PurchaseMode;
    const calc = p.lines.map((l) => calcLine(type, l, mode));
    const gross = calc.reduce((s, c) => s + c.gross, 0), com = calc.reduce((s, c) => s + c.commission, 0);
    const del = p.lines.reduce((s, l) => s + l.deliveryPaise, 0), net = calc.reduce((s, c) => s + c.net, 0);
    return this.atomic(async () => {
      const prev = await this.balance(p.partyId);
      const id = reuseId ?? uid();
      const lines = type === 'SALE'
        ? [{ account: p.partyId, dr: net }, { account: await this.sys('SALES'), cr: gross }, { account: await this.sys('COMMISSION'), cr: com }, { account: await this.sys('DELIVERY'), cr: del }]
        : mode === 'ADD'
          // Original MandiMart: DR Purchase Account (net) / CR Supplier (net); commission & delivery are part of cost
          ? [{ account: await this.sys('PURCHASE'), dr: net }, { account: p.partyId, cr: net }]
          // Patti mode: supplier is paid gross less our commission and hamali
          : [{ account: await this.sys('PURCHASE'), dr: gross }, { account: p.partyId, cr: net }, { account: await this.sys('COMMISSION'), cr: com }, { account: await this.sys('DELIVERY'), cr: del }];
      return this.post({ id, type, date: p.date, partyId: p.partyId, narration: p.narration, total: net, prevBal: prev, vno: reuseVno }, lines, p.lines, calc);
    });
  }
  /** RECEIPT: Dr Cash/Bank / Cr party. PAYMENT: Dr party / Cr Cash/Bank. */
  async createCashVoucher(p: { kind: 'RECEIPT' | 'PAYMENT'; partyId: string; date: string; amountPaise: number; mode: 'CASH' | 'BANK' | 'CHEQUE' | 'UPI' | 'NEFT'; refNo?: string; chequeDate?: string; chequeNo?: string; bankName?: string; cleared?: boolean; narration?: string }, reuseId?: string, reuseVno?: string) {
    if (p.amountPaise <= 0) throw new Error('Amount must be positive');
    return this.atomic(async () => {
      const prev = await this.balance(p.partyId);
      const cash = await this.sys(p.mode === 'CASH' ? 'CASH' : 'BANK');
      const lines = p.kind === 'RECEIPT' ? [{ account: cash, dr: p.amountPaise }, { account: p.partyId, cr: p.amountPaise }] : [{ account: p.partyId, dr: p.amountPaise }, { account: cash, cr: p.amountPaise }];
      return this.post({ id: reuseId ?? uid(), type: p.kind, date: p.date, partyId: p.partyId, total: p.amountPaise, prevBal: prev, mode: p.mode, refNo: p.refNo, chequeDate: p.chequeDate, chequeNo: p.chequeNo, bankName: p.bankName, cleared: p.cleared, narration: p.narration, vno: reuseVno }, lines);
    });
  }
  /** Kharcha: Dr Expense / Cr Cash. */
  async createExpense(p: { date: string; amountPaise: number; category: string; mode?: 'CASH' | 'BANK' }) {
    return this.atomic(async () => this.post({ id: uid(), type: 'EXPENSE', date: p.date, total: p.amountPaise, narration: p.category, mode: p.mode ?? 'CASH' },
      [{ account: await this.sys('EXPENSE'), dr: p.amountPaise }, { account: await this.sys(p.mode === 'BANK' ? 'BANK' : 'CASH'), cr: p.amountPaise }]));
  }

  async softDelete(txnId: string) { await this.db.run('UPDATE transactions SET deleted_at=?, updated_at=? WHERE id=? AND deleted_at IS NULL', [this.now(), this.now(), txnId]); }
  async restore(txnId: string) { await this.db.run('UPDATE transactions SET deleted_at=NULL, updated_at=? WHERE id=?', [this.now(), txnId]); }
  async purgeDeleted(olderThanDays = 30) {
    const cutoff = this.now() - olderThanDays * 86400000;
    await this.db.run('DELETE FROM transactions WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoff]);
    await this.db.run('DELETE FROM accounts WHERE is_system=0 AND deleted_at IS NOT NULL AND deleted_at < ? AND NOT EXISTS (SELECT 1 FROM transaction_lines l WHERE l.account_id=accounts.id) AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.party_id=accounts.id)', [cutoff]);
    await this.db.run('DELETE FROM items WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoff]);
  }


  // ---------- lists, reports, backup ----------
  async transactions(opts: { from?: string; to?: string; type?: string; types?: string[]; partyId?: string; search?: string; deleted?: boolean; limit?: number; offset?: number } = {}) {
    const w: string[] = [opts.deleted ? 't.deleted_at IS NOT NULL' : 't.deleted_at IS NULL']; const p: unknown[] = [];
    if (opts.from) { w.push('t.date>=?'); p.push(opts.from); } if (opts.to) { w.push('t.date<=?'); p.push(opts.to); }
    if (opts.type) { w.push('t.type=?'); p.push(opts.type); } if (opts.types?.length) { w.push(`t.type IN (${opts.types.map(() => '?').join(',')})`); p.push(...opts.types); }
    const sq = (opts.search ?? '').trim(); if (sq) { w.push('(t.voucher_no LIKE ? OR a.name LIKE ? OR a.name_hi LIKE ?)'); p.push(`%${sq}%`, `%${sq}%`, `%${sq}%`); }
    if (opts.partyId) { w.push('t.party_id=?'); p.push(opts.partyId); }
    return this.db.all<any>(`SELECT t.*, a.name party_name, a.name_hi party_name_hi, a.phone party_phone FROM transactions t LEFT JOIN accounts a ON a.id=t.party_id WHERE ${w.join(' AND ')} ORDER BY t.date DESC, t.rowid DESC LIMIT ? OFFSET ?`, [...p, opts.limit ?? 50, opts.offset ?? 0]);
  }

  async getTransaction(id: string) {
    return (await this.db.all<any>('SELECT t.*, a.name party_name, a.name_hi party_name_hi, a.phone party_phone, a.address party_address FROM transactions t LEFT JOIN accounts a ON a.id=t.party_id WHERE t.id=?', [id]))[0] ?? null;
  }
  /** Party balance immediately before this entry (entries ordered by date then creation). */
  async balanceBefore(txnId: string): Promise<number> {
    const t = (await this.db.all<any>('SELECT party_id, date, rowid rid FROM transactions WHERE id=?', [txnId]))[0];
    if (!t?.party_id) return 0;
    const r = await this.db.all<{ b: number }>(`SELECT a.opening_paise + COALESCE((SELECT SUM(l.debit_paise-l.credit_paise) FROM transaction_lines l JOIN transactions x ON x.id=l.txn_id WHERE l.account_id=a.id AND x.deleted_at IS NULL AND (x.date < ? OR (x.date = ? AND x.rowid < ?))),0) b FROM accounts a WHERE a.id=?`, [t.date, t.date, t.rid, t.party_id]);
    return r[0]?.b ?? 0;
  }
  /** Day Book: entries for a date with debit/credit totals from the double-entry lines. */
  async dayBook(date: string) {
    const rows = await this.db.all<any>(`SELECT t.*, a.name party_name, a.name_hi party_name_hi, COALESCE((SELECT SUM(debit_paise) FROM transaction_lines WHERE txn_id=t.id),0) dr, COALESCE((SELECT SUM(credit_paise) FROM transaction_lines WHERE txn_id=t.id),0) cr FROM transactions t LEFT JOIN accounts a ON a.id=t.party_id WHERE t.date=? AND t.deleted_at IS NULL ORDER BY t.rowid DESC`, [date]);
    const totalDebit = rows.reduce((s, r) => s + r.dr, 0), totalCredit = rows.reduce((s, r) => s + r.cr, 0);
    return { rows, totalDebit, totalCredit, difference: totalDebit - totalCredit };
  }
  async softDeleteMany(ids: string[]) { await this.atomic(async () => { for (const id of ids) await this.softDelete(id); }); }
  async billItems(txnId: string) { return this.db.all<any>('SELECT * FROM bill_items WHERE txn_id=?', [txnId]); }
  async lastRate(partyId: string, itemName: string) {
    const r = await this.db.all<{ rate_paise: number; commission_pct: number }>('SELECT b.rate_paise, b.commission_pct FROM bill_items b JOIN transactions t ON t.id=b.txn_id WHERE t.party_id=? AND b.item_name=? AND t.deleted_at IS NULL ORDER BY t.date DESC, t.rowid DESC LIMIT 1', [partyId, itemName]);
    return r[0] ?? null;
  }
  async trialBalance(asOf: string) {
    const rows = await this.db.all<{ id: string; name: string; type: string }>('SELECT id,name,type FROM accounts WHERE deleted_at IS NULL');
    const out = [];
    for (const a of rows) { const b = await this.balance(a.id, asOf); if (b !== 0) out.push({ ...a, dr: b > 0 ? b : 0, cr: b < 0 ? -b : 0 }); }
    return { rows: out, totalDr: out.reduce((s, r) => s + r.dr, 0), totalCr: out.reduce((s, r) => s + r.cr, 0) };
  }
  /** P&L for period: income = commission + delivery recovered + (sales − purchases margin); expenses = EXPENSE accounts. */
  async profitLoss(from: string, to: string) {
    const sum = async (type: AccType, side: 'credit_paise' | 'debit_paise') => (await this.db.all<{ s: number }>(`SELECT COALESCE(SUM(l.${side}),0) s FROM transaction_lines l JOIN transactions t ON t.id=l.txn_id JOIN accounts a ON a.id=l.account_id WHERE a.type=? AND t.deleted_at IS NULL AND t.date>=? AND t.date<=?`, [type, from, to]))[0]!.s;
    const sales = await sum('SALES', 'credit_paise'), purchases = await sum('PURCHASE', 'debit_paise');
    const commission = await sum('COMMISSION', 'credit_paise'), delivery = await sum('DELIVERY', 'credit_paise'), expenses = await sum('EXPENSE', 'debit_paise');
    return { sales, purchases, commission, delivery, expenses, net: sales - purchases + commission + delivery - expenses };
  }
  async itemWiseSales(from: string, to: string) {
    return this.db.all<{ item_name: string; qty: number; gross: number }>(`SELECT b.item_name, SUM(b.qty) qty, SUM(b.gross_paise) gross FROM bill_items b JOIN transactions t ON t.id=b.txn_id WHERE t.type='SALE' AND t.deleted_at IS NULL AND t.date>=? AND t.date<=? GROUP BY b.item_name ORDER BY gross DESC`, [from, to]);
  }
  async counts() {
    const n = async (q: string) => (await this.db.all<{ n: number }>(q))[0]!.n;
    return { vouchers: await n('SELECT COUNT(*) n FROM transactions WHERE deleted_at IS NULL'), parties: await n("SELECT COUNT(*) n FROM accounts WHERE type IN ('CUSTOMER','SUPPLIER') AND deleted_at IS NULL"), items: await n('SELECT COUNT(*) n FROM items WHERE deleted_at IS NULL') };
  }
  async company() { return (await this.db.all<any>('SELECT * FROM company WHERE id=1'))[0]; }
  async saveCompany(c: { name: string; nameHi?: string; address?: string; city?: string; state?: string; phone?: string; gstin?: string; pan?: string; fyStartMonth?: number; purchaseMode?: PurchaseMode }) {
    await this.db.run('UPDATE company SET name=?, name_hi=?, address=?, city=?, state=?, phone=?, gstin=?, pan=?, fy_start_month=?, purchase_mode=?, updated_at=? WHERE id=1',
      [c.name, c.nameHi ?? null, c.address ?? null, c.city ?? null, c.state ?? null, c.phone ?? null, c.gstin ?? null, c.pan ?? null, c.fyStartMonth ?? 4, c.purchaseMode ?? 'ADD', this.now()]);
  }
  static TABLES = ['company', 'accounts', 'items', 'transactions', 'transaction_lines', 'bill_items', 'counters', 'wastage', 'crate_moves'];
  async exportAll() {
    const out: Record<string, any[]> = {};
    for (const t of Repo.TABLES) out[t] = await this.db.all(`SELECT * FROM ${t}`);
    return { app: 'mandi-khata', version: 1, exportedAt: this.now(), data: out };
  }
  async importAll(dump: { app?: string; version?: number; data?: Record<string, any[]> }) {
    if (dump.app !== 'mandi-khata' || !dump.data) throw new Error('Not a Mandi Khata backup');
    const data = dump.data;
    await this.db.tx(async () => {
      for (const t of [...Repo.TABLES].reverse()) await this.db.run(`DELETE FROM ${t}`);
      for (const t of Repo.TABLES) for (const row of data[t] ?? []) {
        const keys = Object.keys(row);
        if (!keys.every((k) => /^\w+$/.test(k))) throw new Error('Corrupt backup');
        await this.db.run(`INSERT INTO ${t}(${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => row[k]));
      }
    });
  }


  // ---------- items, stock, wastage, crates ----------
  async listItems(search?: string, deleted = false) {
    const q = (search ?? '').trim().replace(/\s+/g, ' ');
    return this.db.all<any>(`SELECT * FROM items WHERE deleted_at IS ${deleted ? 'NOT NULL' : 'NULL'} ${q ? 'AND (name LIKE ? OR name_hi LIKE ?)' : ''} ORDER BY name`, q ? [`%${q}%`, `%${q}%`] : []);
  }
  async deleteItem(id: string) { await this.db.run('UPDATE items SET deleted_at=?, updated_at=? WHERE id=?', [this.now(), this.now(), id]); }
  async addWastage(w: { itemName: string; unit?: string; qty: number; date: string; note?: string }) {
    if (!(w.qty > 0)) throw new Error('Quantity must be positive');
    await this.db.run('INSERT INTO wastage(id,item_name,unit,qty,date,note,updated_at) VALUES (?,?,?,?,?,?,?)', [uid(), w.itemName.trim(), w.unit ?? 'KG', w.qty, w.date, w.note ?? null, this.now()]);
  }
  /** Stock = purchased − sold − wasted, per item+unit (all-time, non-deleted). */
  async stock() {
    const rows = await this.db.all<{ item_name: string; unit: string; bought: number; sold: number; wasted: number; stock: number }>(`
      WITH k AS (SELECT item_name, unit FROM bill_items UNION SELECT item_name, unit FROM wastage WHERE deleted_at IS NULL)
      SELECT k.item_name, k.unit,
        COALESCE((SELECT SUM(b.qty) FROM bill_items b JOIN transactions t ON t.id=b.txn_id WHERE t.type='PURCHASE' AND t.deleted_at IS NULL AND b.item_name=k.item_name AND b.unit=k.unit),0) bought,
        COALESCE((SELECT SUM(b.qty) FROM bill_items b JOIN transactions t ON t.id=b.txn_id WHERE t.type='SALE' AND t.deleted_at IS NULL AND b.item_name=k.item_name AND b.unit=k.unit),0) sold,
        COALESCE((SELECT SUM(w.qty) FROM wastage w WHERE w.deleted_at IS NULL AND w.item_name=k.item_name AND w.unit=k.unit),0) wasted,
        0 stock FROM k ORDER BY k.item_name`);
    return rows.map((x) => ({ ...x, stock: x.bought - x.sold - x.wasted }));
  }
  async crateMove(m: { partyId: string; date: string; given?: number; returned?: number; note?: string }) {
    if (!((m.given ?? 0) > 0 || (m.returned ?? 0) > 0)) throw new Error('Enter crates given or returned');
    await this.db.run('INSERT INTO crate_moves(id,party_id,date,given,returned,note,updated_at) VALUES (?,?,?,?,?,?,?)', [uid(), m.partyId, m.date, Math.floor(m.given ?? 0), Math.floor(m.returned ?? 0), m.note ?? null, this.now()]);
  }
  async crateBalances() {
    return this.db.all<{ id: string; name: string; held: number }>(`SELECT a.id, a.name, SUM(c.given) - SUM(c.returned) held FROM crate_moves c JOIN accounts a ON a.id=c.party_id WHERE c.deleted_at IS NULL GROUP BY a.id HAVING held <> 0 ORDER BY held DESC`);
  }

  /** Ledger with running balance for an account. */
  async ledger(accountId: string, from?: string, to?: string) {
    const open = from ? await this.balance(accountId, prevDay(from)) : (await this.db.all<{ o: number }>('SELECT opening_paise o FROM accounts WHERE id=?', [accountId]))[0]?.o ?? 0;
    const rows = await this.db.all<any>(
      `SELECT t.id, t.date, t.type, t.voucher_no, t.narration, l.debit_paise dr, l.credit_paise cr FROM transaction_lines l JOIN transactions t ON t.id=l.txn_id
       WHERE l.account_id=? AND t.deleted_at IS NULL ${from ? 'AND t.date>=?' : ''} ${to ? 'AND t.date<=?' : ''} ORDER BY t.date, t.rowid`,
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

  /**
   * Outstanding with aging buckets via FIFO (payments clear the oldest bills first).
   * CUSTOMER => receivables (debit bills), SUPPLIER => payables (credit bills).
   */
  async outstanding(asOf: string, kind: 'CUSTOMER' | 'SUPPLIER' = 'CUSTOMER', search?: string) {
    const sign = kind === 'CUSTOMER' ? 1 : -1;
    const q = (search ?? '').trim();
    const parties = await this.db.all<{ id: string; name: string; name_hi: string | null; opening_paise: number; phone: string | null }>(
      `SELECT id,name,name_hi,opening_paise,phone FROM accounts WHERE type=? AND deleted_at IS NULL ${q ? 'AND (name LIKE ? OR name_hi LIKE ? OR phone LIKE ?)' : ''}`, q ? [kind, `%${q}%`, `%${q}%`, `%${q}%`] : [kind]);
    const out = [];
    for (const p of parties) {
      const rows = await this.db.all<{ date: string; dr: number; cr: number }>(
        `SELECT t.date, l.debit_paise dr, l.credit_paise cr FROM transaction_lines l JOIN transactions t ON t.id=l.txn_id WHERE l.account_id=? AND t.deleted_at IS NULL AND t.date<=? ORDER BY t.date, t.rowid`, [p.id, asOf]);
      const bills: { date: string; amt: number }[] = [];
      const open = sign * p.opening_paise;
      if (open > 0) bills.push({ date: '0000-00-00', amt: open });
      let credit = open < 0 ? -open : 0;
      for (const r of rows) { const net = sign * (r.dr - r.cr); if (net > 0) bills.push({ date: r.date, amt: net }); else credit += -net; }
      for (const b of bills) { const use = Math.min(b.amt, credit); b.amt -= use; credit -= use; }
      const bk = { b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0 };
      let oldest: string | null = null;
      for (const b of bills) {
        if (b.amt <= 0) continue;
        if (!oldest && b.date !== '0000-00-00') oldest = b.date;
        const age = b.date === '0000-00-00' ? 9999 : Math.floor((Date.parse(asOf) - Date.parse(b.date)) / 86400000);
        if (age <= 30) bk.b0_30 += b.amt; else if (age <= 60) bk.b31_60 += b.amt; else if (age <= 90) bk.b61_90 += b.amt; else bk.b90p += b.amt;
      }
      const total = bk.b0_30 + bk.b31_60 + bk.b61_90 + bk.b90p;
      if (total > 0) out.push({ partyId: p.id, name: p.name, nameHi: p.name_hi, phone: p.phone, total, oldest, ...bk });
    }
    return out.sort((a, b) => b.total - a.total);
  }
}

function calcLine(type: 'SALE' | 'PURCHASE', l: BillLine, mode: PurchaseMode = 'ADD') {
  const gross = grossPaise(l.qty, l.ratePaise);
  const commission = commissionPaise(gross, l.commissionPct);
  const b = { gross, commissionPct: l.commissionPct, delivery: l.deliveryPaise };
  return { gross, commission, net: type === 'SALE' ? saleNet(b) : purchaseNet(b, mode) };
}
function prevDay(d: string) { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); }

export interface AccountInput { name: string; nameHi?: string; type: 'CUSTOMER' | 'SUPPLIER'; phone?: string; address?: string; city?: string; gstin?: string; pan?: string; bankName?: string; bankAccountNo?: string; bankIfsc?: string; openingPaise?: number; commissionPct?: number; creditDays?: number; creditLimitPaise?: number; }
export interface ItemInput { name: string; nameHi?: string; unit?: string; ratePaise?: number; hsn?: string; gstRate?: number; category?: string; }
const nz = (v?: string) => (v && v.trim() ? v.trim() : null);
function normAccount(a: AccountInput) {
  return { name: a.name.trim().replace(/\s+/g, ' '), nameHi: nz(a.nameHi), phone: nz(a.phone), address: nz(a.address), city: nz(a.city), gstin: nz(a.gstin), pan: nz(a.pan), bankName: nz(a.bankName), bankAccountNo: nz(a.bankAccountNo), bankIfsc: nz(a.bankIfsc) };
}
