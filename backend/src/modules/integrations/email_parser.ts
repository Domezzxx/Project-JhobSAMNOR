/** Parser อีเมล/ข้อความแจ้งเตือนธนาคารไทย → transaction
 *  ⚠️ pattern เริ่มต้น — ต้องจูนตามฟอร์แมตอีเมลจริงของแต่ละธนาคาร (ดู docs/SETUP_EMAIL_PARSING.md) */

export interface ParsedEmailTxn {
  type: 'income' | 'expense';
  amount: number; // สตางค์
  occurredAt: Date;
  note: string;
  bank?: string;
  externalId?: string;
}

/** โดเมนผู้ส่ง → ชื่อธนาคาร (ใช้ทั้ง detect + สร้าง Gmail query) */
export const BANK_SENDERS: Record<string, string> = {
  'scb.co.th': 'SCB',
  'kasikornbank.com': 'KBank',
  'kbank.co.th': 'KBank',
  'bangkokbank.com': 'BBL',
  'krungsri.com': 'Krungsri',
  'ktb.co.th': 'Krungthai',
  'ttbbank.com': 'TTB',
  'tmbbank.com': 'TTB',
};

const INCOME_KW = /(เงินเข้า|รับโอน|โอนเข้า|รับเงิน|เงินเดือน|received|credit|deposit)/i;
const EXPENSE_KW = /(ใช้จ่าย|ชำระ|โอนออก|ถอน|หักบัญชี|ซื้อ|จ่ายเงิน|payment|debit|purchase|withdraw|spent)/i;
const THAI_MONTHS: Record<string, number> = {
  'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
  'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12,
};

function parseAmount(text: string): number | null {
  const m =
    text.match(/(?:จำนวน(?:เงิน)?|amount|ยอด|THB|฿)\s*:?\s*([\d,]+\.\d{2})/i) ??
    text.match(/([\d,]+\.\d{2})\s*(?:บาท|THB)/i);
  if (!m) return null;
  return Math.round(parseFloat(m[1].replace(/,/g, '')) * 100);
}

function parseDate(text: string): Date {
  const m = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (m) {
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (year > 2400) year -= 543; // พ.ศ. -> ค.ศ.
    const dt = new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    if (!isNaN(dt.getTime())) return dt;
  }
  const months = Object.keys(THAI_MONTHS).map((k) => k.replace(/\./g, '\\.')).join('|');
  const tm = text.match(new RegExp(`(\\d{1,2})\\s*(${months})\\s*(\\d{2,4})`));
  if (tm) {
    let year = parseInt(tm[3], 10);
    if (year < 100) year += 2500;
    if (year > 2400) year -= 543;
    const dt = new Date(year, THAI_MONTHS[tm[2]] - 1, parseInt(tm[1], 10));
    if (!isNaN(dt.getTime())) return dt;
  }
  return new Date();
}

function parseMerchant(text: string): string | undefined {
  const m = text.match(/(?:ที่|ร้าน|ไปยัง|merchant|ผู้รับ|to)\s*:?\s*([^\n,<]{2,40})/i);
  return m?.[1].trim();
}

/** parse อีเมล/ข้อความแจ้งเตือน → transaction (คืน null ถ้าไม่พบจำนวนเงิน = ไม่ใช่รายการ) */
export function parseBankEmail(opts: {
  subject?: string;
  body: string;
  from?: string;
  messageId?: string;
}): ParsedEmailTxn | null {
  const text = `${opts.subject ?? ''}\n${opts.body}`;
  const amount = parseAmount(text);
  if (!amount) return null;
  const type: 'income' | 'expense' =
    INCOME_KW.test(text) && !EXPENSE_KW.test(text) ? 'income' : 'expense';
  const bank = opts.from
    ? Object.entries(BANK_SENDERS).find(([dom]) => opts.from!.toLowerCase().includes(dom))?.[1]
    : undefined;
  const merchant = parseMerchant(text);
  const note = [merchant, bank].filter(Boolean).join(' · ') || opts.subject || 'จากอีเมลธนาคาร';
  return { type, amount, occurredAt: parseDate(text), note, bank, externalId: opts.messageId };
}

/** Gmail search query — เฉพาะเมลจากธนาคาร 60 วันล่าสุด */
export const BANK_EMAIL_QUERY =
  'from:(' + Object.keys(BANK_SENDERS).join(' OR ') + ') newer_than:60d';
