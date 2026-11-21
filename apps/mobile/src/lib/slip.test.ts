import { describe, it, expect } from 'vitest';
import { slipHtml, reminderText, waLink } from './slip';
describe('slip', () => {
  it('escapes html and shows balances', () => {
    const h = slipHtml({ shop: { name: '<b>X</b>' }, party: 'A&B', prevBalance: 50000, items: [{ item_name: 'Aloo', qty: 10, unit: 'KG', rate_paise: 2000, gross_paise: 20000, commission_pct: 5, commission_paise: 1000, delivery_paise: 0, net_paise: 21000 }],
      txn: { type: 'SALE', voucher_no: 'S-2627-0001', date: '2026-04-10', total_paise: 21000, mode: null } });
    expect(h).toContain('&lt;b&gt;X&lt;/b&gt;'); expect(h).toContain('A&amp;B'); expect(h).toContain('₹710.00 Dr');
  });
  it('wa link adds country code', () => { expect(waLink('9876543210', 'hi')).toBe('https://wa.me/919876543210?text=hi'); expect(reminderText('R', 100000, 'S', undefined, false)).toContain('₹1,000'); });
});
