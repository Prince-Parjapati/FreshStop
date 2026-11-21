import { z } from 'zod';
export const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile');
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  shopName: z.string().trim().min(2).max(80),
  phone,
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  city: z.string().trim().min(2).max(60),
  language: z.enum(['en', 'hi']).default('hi'),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export const paymentSubmitSchema = z.object({
  utr: z.string().trim().regex(/^[A-Za-z0-9]{8,30}$/, 'Invalid UTR'),
  payerName: z.string().trim().min(2).max(80),
  method: z.enum(['UPI', 'CASH', 'BANK']),
  amountPaise: z.number().int().positive(),
});
export const unitSchema = z.enum(['KG', 'QTL', 'PCS', 'BOX', 'BAG', 'DZN', 'CRATE']);
export const voucherTypeSchema = z.enum(['SALE', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'EXPENSE']);
export const payModeSchema = z.enum(['CASH', 'BANK', 'CHEQUE', 'UPI', 'NEFT']);
export const saleLineSchema = z.object({
  itemId: z.string(), qty: z.number().positive(), unit: unitSchema,
  ratePaise: z.number().int().nonnegative(),
});
export const searchTerm = (s: string) => s.trim().replace(/\s+/g, ' ');
