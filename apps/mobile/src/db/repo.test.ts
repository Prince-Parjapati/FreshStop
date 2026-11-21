import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { migrate } from './migrate';
import { Repo } from './repo';
import type { Db } from './types';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

function mem(): Db {
  const d = new DatabaseSync(':memory:');
  d.exec('PRAGMA foreign_keys=ON');
  return {
    exec: (s) => d.exec(s),
    run: (s, p = []) => { d.prepare(s).run(...(p as any[])); },
    all: (s, p = []) => d.prepare(s).all(...(p as any[])) as any[],
    tx: async (fn) => {
      d.exec('BEGIN');
      try { const r = await fn(); d.exec('COMMIT'); return r; } catch (e) { d.exec('ROLLBACK'); throw e; }
    },
  };
}
let repo: Repo, cust: string, sup: string;
beforeEach(async () => {
  const db = mem();
  await migrate(db);
  repo = new Repo(db);
  await repo.seedSystemAccounts();
  cust = await repo.addAccount({ name: 'Ramesh', type: 'CUSTOMER', openingPaise: 50000 });
  sup = await repo.addAccount({ name: 'Farmer', type: 'SUPPLIER' });
});
const line = { itemName: 'Aloo', qty: 100, unit: 'KG', ratePaise: 2000, commissionPct: 5, deliveryPaise: 1000 };

describe('ledger', () => {
  it('sale posts balanced entry and updates party balance', async () => {
    const r = await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    expect(r.voucherNo).toBe('SL-2026-00001');
    expect(await repo.balance(cust)).toBe(261000); // 50000 + 200000 + 10000 + 1000
  });
  it('receipt reduces receivable; farmer purchase + payment settles', async () => {
    await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    await repo.createCashVoucher({ kind: 'RECEIPT', partyId: cust, date: '2026-04-11', amountPaise: 100000, mode: 'CASH' });
    expect(await repo.balance(cust)).toBe(161000);
    await repo.createPurchase({ partyId: sup, date: '2026-04-10', lines: [line] });
    expect(await repo.balance(sup)).toBe(-211000);
    await repo.createCashVoucher({ kind: 'PAYMENT', partyId: sup, date: '2026-04-12', amountPaise: 211000, mode: 'UPI' });
    expect(await repo.balance(sup)).toBe(0);
  });
  it('soft delete / restore affects balance', async () => {
    const r = await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    await repo.softDelete(r.id);
    expect(await repo.balance(cust)).toBe(50000);
    await repo.restore(r.id);
    expect(await repo.balance(cust)).toBe(261000);
  });
  it('rejects bad input', async () => {
    await expect(repo.createCashVoucher({ kind: 'RECEIPT', partyId: cust, date: '2026-04-10', amountPaise: 0, mode: 'CASH' })).rejects.toThrow();
    await expect(repo.createSale({ partyId: cust, date: '2026-04-10', lines: [] })).rejects.toThrow();
  });
  it('ledger running balance + dashboard', async () => {
    await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    await repo.createCashVoucher({ kind: 'RECEIPT', partyId: cust, date: '2026-04-11', amountPaise: 100000, mode: 'CASH' });
    const l = await repo.ledger(cust, '2026-04-10', '2026-04-30');
    expect(l.opening).toBe(50000);
    expect(l.closing).toBe(161000);
    expect(l.rows.map((r: any) => r.balance)).toEqual([261000, 161000]);
    const d = await repo.dashboard('2026-04-11');
    expect(d.todayReceipts).toBe(100000);
    expect(d.cashBalance).toBe(100000);
    expect(d.receivables).toBe(161000);
  });
  it('aging uses FIFO allocation (opening cleared first)', async () => {
    await repo.createSale({ partyId: cust, date: '2026-01-01', lines: [line] }); // 211000 (>90d old)
    await repo.createCashVoucher({ kind: 'RECEIPT', partyId: cust, date: '2026-04-01', amountPaise: 100000, mode: 'CASH' });
    await repo.createSale({ partyId: cust, date: '2026-04-05', lines: [line] }); // 211000 recent
    const [o] = await repo.outstanding('2026-04-10');
    expect(o!.total).toBe(50000 + 211000 + 211000 - 100000);
    expect(o!.b0_30).toBe(211000);
    expect(o!.b90p).toBe(o!.total - 211000);
  });
  it('voucher numbers increment per type and FY', async () => {
    const a = await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    const b = await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    const c = await repo.createSale({ partyId: cust, date: '2027-04-10', lines: [line] });
    expect([a.voucherNo, b.voucherNo, c.voucherNo]).toEqual(['SL-2026-00001', 'SL-2026-00002', 'SL-2027-00001']);
  });
  it('trial balance balances, P&L, item sales', async () => {
    await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    await repo.createPurchase({ partyId: sup, date: '2026-04-10', lines: [line] });
    await repo.createExpense({ date: '2026-04-11', amountPaise: 5000, category: 'Rent' });
    const tb = await repo.trialBalance('2026-04-30');
    expect(tb.totalDr - tb.totalCr).toBe(50000); // difference equals the one-sided customer opening balance
    const pl = await repo.profitLoss('2026-04-01', '2026-04-30');
    expect(pl).toMatchObject({ sales: 200000, purchases: 211000, commission: 10000, delivery: 1000, expenses: 5000, net: -5000 });
    expect((await repo.itemWiseSales('2026-04-01', '2026-04-30'))[0]).toMatchObject({ item_name: 'Aloo', qty: 100 });
  });
  it('backup round-trips and restores identical balances', async () => {
    await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    const dump = await repo.exportAll();
    await repo.softDelete((await repo.transactions())[0].id);
    await repo.importAll(JSON.parse(JSON.stringify(dump)));
    expect(await repo.balance(cust)).toBe(261000);
    await expect(repo.importAll({ app: 'x' } as any)).rejects.toThrow();
  });
  it('last rate memory + counts', async () => {
    await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    expect((await repo.lastRate(cust, 'Aloo'))?.rate_paise).toBe(2000);
    expect((await repo.counts()).vouchers).toBe(1);
  });
  it('edit bill keeps voucher no, re-posts balances and stays balanced', async () => {
    const r = await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    const e = await repo.editBill(r.id, { partyId: cust, date: '2026-04-10', lines: [{ ...line, qty: 50 }, { ...line, itemName: 'Pyaz', qty: 10, ratePaise: 3000 }] });
    expect(e.voucherNo).toBe(r.voucherNo);
    // 50*2000=100000 +5% =5000 +1000 ; 10*3000=30000 +1500 +1000 => 100000+5000+1000+30000+1500+1000
    expect(await repo.balance(cust)).toBe(50000 + 138500);
    expect((await repo.transactions()).length).toBe(1);
    expect((await repo.billItems(r.id)).length).toBe(2);
    await expect(repo.editBill(r.id, { partyId: cust, date: '2026-04-10', lines: [] })).rejects.toThrow();
    expect(await repo.balance(cust)).toBe(50000 + 138500); // failed edit rolled back
  });
  it('edit receipt', async () => {
    const r = await repo.createCashVoucher({ kind: 'RECEIPT', partyId: cust, date: '2026-04-10', amountPaise: 10000, mode: 'CASH' });
    await repo.editCashVoucher(r.id, { partyId: cust, date: '2026-04-10', amountPaise: 30000, mode: 'UPI' });
    expect(await repo.balance(cust)).toBe(20000);
  });
  it('stock = bought - sold - wasted, crates balance', async () => {
    await repo.createPurchase({ partyId: sup, date: '2026-04-10', lines: [{ ...line, qty: 100 }] });
    await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [{ ...line, qty: 60 }] });
    await repo.addWastage({ itemName: 'Aloo', qty: 5, date: '2026-04-11' });
    expect((await repo.stock())[0]).toMatchObject({ item_name: 'Aloo', bought: 100, sold: 60, wasted: 5, stock: 35 });
    await repo.crateMove({ partyId: cust, date: '2026-04-10', given: 20 }); await repo.crateMove({ partyId: cust, date: '2026-04-12', returned: 8 });
    expect((await repo.crateBalances())[0]).toMatchObject({ name: 'Ramesh', held: 12 });
    await expect(repo.crateMove({ partyId: cust, date: '2026-04-10' })).rejects.toThrow();
  });
  it('patti (DEDUCT) mode pays farmer gross minus commission and delivery', async () => {
    await (repo as any).db.run("UPDATE company SET purchase_mode='DEDUCT' WHERE id=1");
    await repo.createPurchase({ partyId: sup, date: '2026-04-10', lines: [line] });
    expect(await repo.balance(sup)).toBe(-189000);
    const tb = await repo.trialBalance('2026-04-30'); expect(tb.totalCr).toBeGreaterThan(0);
  });
  it('previous balance before an entry and day book totals', async () => {
    const a = await repo.createSale({ partyId: cust, date: '2026-04-10', lines: [line] });
    const b = await repo.createCashVoucher({ kind: 'RECEIPT', partyId: cust, date: '2026-04-10', amountPaise: 100000, mode: 'CASH' });
    expect(await repo.balanceBefore(a.id)).toBe(50000);
    expect(await repo.balanceBefore(b.id)).toBe(261000);
    const d = await repo.dayBook('2026-04-10');
    expect(d.rows.length).toBe(2); expect(d.difference).toBe(0); expect(d.totalDebit).toBe(d.totalCredit);
  });
  it('supplier payables aging + receivable search', async () => {
    await repo.createPurchase({ partyId: sup, date: '2026-04-05', lines: [line] });
    const pay = await repo.outstanding('2026-04-10', 'SUPPLIER');
    expect(pay[0]).toMatchObject({ name: 'Farmer', total: 211000, b0_30: 211000 });
    expect((await repo.outstanding('2026-04-10', 'CUSTOMER', 'ram'))[0]?.name).toBe('Ramesh');
    expect(await repo.outstanding('2026-04-10', 'CUSTOMER', 'zzz')).toEqual([]);
  });
  it('party CRUD with soft delete, restore, full fields and search', async () => {
    const id = await repo.addAccount({ name: 'Suresh  Kumar', nameHi: 'सुरेश', type: 'CUSTOMER', phone: '9000000001', city: 'Hisar', gstin: '06AAAAA0000A1Z5', openingPaise: -2500, commissionPct: 4, creditDays: 15 });
    expect((await repo.getAccount(id)).name).toBe('Suresh Kumar');
    await repo.updateAccount(id, { name: 'Suresh K', type: 'CUSTOMER', phone: '9000000001', openingPaise: 0, bankName: 'SBI' });
    expect((await repo.getAccount(id)).bank_name).toBe('SBI');
    expect((await repo.listAccounts({ search: 'सुरेश' })).length).toBe(0); // nameHi cleared by update
    expect((await repo.listAccounts({ search: '9000000001' })).length).toBe(1);
    await repo.deleteAccount(id); expect((await repo.listAccounts({ type: 'CUSTOMER' })).some((a: any) => a.id === id)).toBe(false);
    expect((await repo.listAccounts({ deleted: true })).length).toBe(1);
    await repo.restoreAccount(id); expect((await repo.listAccounts({ search: 'Suresh' })).length).toBe(1);
  });
  it('cheque + UTR details are stored; items with HSN/GST', async () => {
    const r = await repo.createCashVoucher({ kind: 'RECEIPT', partyId: cust, date: '2026-04-10', amountPaise: 5000, mode: 'CHEQUE', chequeNo: '123456', chequeDate: '2026-04-20', bankName: 'HDFC', cleared: false });
    const t = await repo.getTransaction(r.id);
    expect(t).toMatchObject({ cheque_no: '123456', bank_name: 'HDFC', cheque_date: '2026-04-20', cleared: 0 });
    const iid = await repo.addItem({ name: 'Tomato', nameHi: 'टमाटर', unit: 'CRATE', ratePaise: 1500, hsn: '0702', gstRate: 0, category: 'Vegetable' });
    await repo.updateItem(iid, { name: 'Tomato', unit: 'KG', ratePaise: 1800 });
    expect((await repo.getItem(iid)).default_rate_paise).toBe(1800);
    expect((await repo.listItems('tom')).length).toBe(1);
  });
});
