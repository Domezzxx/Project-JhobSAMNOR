import { z } from 'zod';

// 💡 amount = สตางค์ (integer, 1 บาท = 100)
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'password ต้องอย่างน้อย 6 ตัว'),
  displayName: z.string().min(1).max(60).optional(),
  monthlyIncome: z.number().int().nonnegative().max(2147483647, 'รายได้ต่อเดือนสูงเกินขีดจำกัด').optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().int().positive('จำนวนเงินต้องมากกว่า 0').max(2147483647, 'จำนวนเงินสูงเกินขีดจำกัด (สูงสุดไม่เกิน 21.4 ล้านบาท)'),
  note: z.string().max(280).optional(),
  source: z.enum(['manual', 'ocr', 'sms']).default('manual'),
  categoryId: z.string().nullable().optional(),
  occurredAt: z.string().datetime().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();
