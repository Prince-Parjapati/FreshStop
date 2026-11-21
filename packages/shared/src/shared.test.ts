import { describe, it, expect } from 'vitest';
import { formatINR, toPaise, saleNet, purchaseNet, amountInWords, financialYear, voucherNo, licenceState, evaluateMath, evaluateCommissionRate } from './index';

describe('money', () => {
  it('formats Indian grouping', () => {
    expect(formatINR(12345600)).toBe('₹1,23,456.00');
    expect(formatINR(-99)).toBe('-₹0.99');
    expect(formatINR(100000000000, { decimals: false })).toBe('₹1,00,00,00,000');
  });
  it('toPaise rounds', () => { expect(toPaise('1,234.567')).toBe(123457); expect(toPaise(0.1 + 0.2)).toBe(30); });
  it('sale/purchase net', () => {
    const b = { gross: 100000, commissionPct: 6, delivery: 5000 };
    expect(saleNet(b)).toBe(111000);
    expect(purchaseNet(b)).toBe(111000);
    expect(purchaseNet(b, 'DEDUCT')).toBe(89000);
  });
  it('words', () => { expect(amountInWords(12345600)).toBe('One Lakh Twenty Three Thousand Four Hundred Fifty Six Rupees Only'); });
});
describe('fy', () => {
  it('computes FY', () => {
    expect(financialYear(new Date(2026, 1, 10)).label).toBe('2025-2026');
    expect(financialYear(new Date(2026, 3, 1)).short).toBe('2627');
    expect(voucherNo('SALE', 2025, 7)).toBe('SL-2025-00007');
  });
});
describe('licence', () => {
  const c = { uid: 'u', plan: 'life', iat: 0, exp: null, dev: 'd', graceDays: 14, status: 'ACTIVE' as const };
  const D = 86400000, now = 100 * D;
  it('states', () => {
    expect(licenceState(c, now, now - 2 * D, now)).toBe('OK');
    expect(licenceState(c, now, now - 11 * D, now)).toBe('WARN');
    expect(licenceState(c, now, now - 15 * D, now)).toBe('LOCKED_OFFLINE');
    expect(licenceState(c, now - 3 * D, now, now)).toBe('CLOCK_TAMPER');
    expect(licenceState({ ...c, status: 'BLOCKED' }, now, now, now)).toBe('BLOCKED');
  });
  it('trial token locks when the trial ends', () => {
    const t = { ...c, status: 'TRIAL' as const, exp: Math.floor((now + 2 * D) / 1000) };
    expect(licenceState(t, now, now, now)).toBe('OK');
    expect(licenceState(t, now + 3 * D, now, now + 3 * D)).toBe('EXPIRED');
  });
});
describe('calculator fields', () => {
  it('evaluates expressions safely', () => {
    expect(evaluateMath('10+20')).toBe(30); expect(evaluateMath('5*10')).toBe(50); expect(evaluateMath('50/2')).toBe(25);
    expect(evaluateMath('10+')).toBe(10); expect(evaluateMath('2+3*4')).toBe(14); expect(evaluateMath('(2+3)*4')).toBe(20);
    expect(evaluateMath('abc')).toBe(0); expect(evaluateMath('1/0')).toBe(0); expect(evaluateMath('process.exit()')).toBe(0);
  });
  it('successive commission', () => { expect(evaluateCommissionRate('50+20')).toBe(60); expect(evaluateCommissionRate('5')).toBe(5); expect(evaluateCommissionRate('')).toBe(0); });
});
