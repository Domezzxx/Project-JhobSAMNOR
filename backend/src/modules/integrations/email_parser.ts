/** Parser อีเมลธุรกรรม → transaction
 *  รองรับ 2 แหล่ง: (1) ใบเสร็จ/ยืนยันคำสั่งซื้อจากร้านค้า (2) แจ้งเตือนธนาคาร (ถ้ามี)
 *  ⚠️ heuristic — ดูยอด "รวม/ชำระ" ก่อน ไม่งั้นเอายอดมากสุด · จูนเพิ่มได้ใน docs/SETUP_EMAIL_PARSING.md */

export interface ParsedEmailTxn {
  type: 'income' | 'expense';
  amount: number; // สตางค์
  occurredAt: Date;
  note: string;
  bank?: string;
  externalId?: string;
}

/** โดเมนผู้ส่งธนาคาร (ไว้ทั้ง detect + query) */
export const BANK_SENDERS: Record<string, string> = {
  'scb.co.th': 'SCB',
  'kasikornbank.com': 'KBank',
  'kbank.co.th': 'KBank',
  'bangkokbank.com': 'BBL',
  'krungsri.com': 'Krungsri',
  'krungthai.com': 'Krungthai',
  'ktb.co.th': 'Krungthai',
  'ttbbank.com': 'TTB',
  'tmbbank.com': 'TTB',
};

// คำที่บอกว่าเป็น "ใบเสร็จ/ธุรกรรมจริง" (กันจดหมายข่าวที่บังเอิญมีตัวเลขราคา)
const RECEIPT_INTENT =
  /(ใบเสร็จ|ใบกำกับ|ใบเสร็จรับเงิน|ยืนยันการชำระ|ชำระเงิน|ชำระเรียบร้อย|การสั่งซื้อ|คำสั่งซื้อ|สั่งซื้อ|ใบยืนยันการจอง|ยืนยันการจอง|เติมเงิน|ขอบคุณสำหรับการสั่งซื้อ|ยอดชำระ|ยอดรวม|order\s*(confirmation|receipt|summary)?|receipt|invoice|booking\s*confirmation|payment\s*(received|receipt|confirmation)|your\s*(order|purchase|receipt)|total)/i;

const INCOME_KW = /(เงินเข้า|รับโอน|โอนเข้า|รับเงิน|เงินเดือน|คืนเงิน|refund|received|credit|deposit)/i;
const EXPENSE_KW =
  /(ใช้จ่าย|ชำระ|โอนออก|ถอน|หักบัญชี|ซื้อ|สั่งซื้อ|จ่ายเงิน|จอง|เติมเงิน|payment|debit|purchase|withdraw|spent|order|charged|booking|invoice)/i;

const THAI_MONTHS: Record<string, number> = {
  'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
  'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12,
};

/** เก็บจำนวนเงินทุกตัว (รองรับ ฿/THB/บาท นำหน้าหรือตามหลัง, มี/ไม่มีทศนิยม) → สตางค์ */
function allAmounts(text: string): number[] {
  const out: number[] = [];
  const re =
    /(?:฿|THB)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?)|([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?|[0-9]+\.\d{2})\s*(?:บาท|THB|฿)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = (m[1] ?? m[2] ?? '').replace(/,/g, '');
    const v = parseFloat(raw);
    if (!isNaN(v) && v > 0) out.push(Math.round(v * 100));
  }
  return out;
}

/** เลือกยอด: ดูข้าง "ยอดรวม/ยอดชำระ/total" ก่อน ไม่งั้นเอายอดมากสุด (มักเป็นยอดรวม) */
function pickAmount(text: string): number | null {
  const tm = text.match(
    /(?:ยอดรวมทั้งสิ้น|ยอดรวมสุทธิ|ยอดรวม|ยอดชำระ|ยอดสุทธิ|รวมทั้งสิ้น|ยอดเงิน|grand\s*total|total\s*(?:paid|amount)?|amount\s*paid)\s*:?\s*(?:฿|THB)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)/i,
  );
  if (tm) {
    const v = parseFloat(tm[1].replace(/,/g, ''));
    if (!isNaN(v) && v > 0) return Math.round(v * 100);
  }
  const all = allAmounts(text);
  return all.length ? Math.max(...all) : null;
}

/** เดาวันที่จากเนื้ออีเมล (คืน null ถ้าไม่เจอ) — ใช้เป็นรอง เพราะ body มักมีเลขมั่ว (ref/บัตร) */
function parseBodyDate(text: string): Date | null {
  const m = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (m) {
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (year > 2400) year -= 543;
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
  return null;
}

/** วันที่ธุรกรรม: ใช้ "วันที่อีเมลถูกส่ง" เป็นหลัก (≈เวลาซื้อ) — เชื่อ body date เฉพาะถ้าใกล้กัน (±120 วัน) */
function resolveDate(text: string, receivedAt?: Date): Date {
  const body = parseBodyDate(text);
  if (receivedAt) {
    if (body && Math.abs(body.getTime() - receivedAt.getTime()) <= 120 * 86400_000) return body;
    return receivedAt;
  }
  return body ?? new Date();
}

/** ชื่อร้าน/ผู้ขายจากชื่อผู้ส่ง ("Steam Support" → "Steam", "Agoda Customer Service" → "Agoda") */
function merchantFromSender(from?: string): string | undefined {
  if (!from) return undefined;
  let name = from.replace(/<[^>]*>/g, '').replace(/["']/g, '').trim();
  if (!name) return from.match(/@([^>\s.]+)/)?.[1];
  name = name
    .replace(/\b(support|customer\s*service|service|online|thailand|team|noreply|no-?reply|payments?|store|enews|newsletter|notification)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return name || undefined;
}

/** parse อีเมล → transaction (null ถ้าไม่ใช่ธุรกรรม: ไม่มีจำนวนเงิน หรือไม่มีเจตนาใบเสร็จ/ไม่ใช่ธนาคาร) */
export function parseBankEmail(opts: {
  subject?: string;
  body: string;
  from?: string;
  messageId?: string;
  receivedAt?: Date;
}): ParsedEmailTxn | null {
  const text = `${opts.subject ?? ''}\n${opts.body}`;
  const amount = pickAmount(text);
  if (!amount) return null;

  const bankDom = opts.from
    ? Object.keys(BANK_SENDERS).find((d) => opts.from!.toLowerCase().includes(d))
    : undefined;
  // ต้องเป็นใบเสร็จ หรือ มาจากธนาคาร — ไม่งั้นข้าม (กันจดหมายข่าว/โปรที่มีราคา)
  if (!bankDom && !RECEIPT_INTENT.test(text)) return null;

  const type: 'income' | 'expense' =
    INCOME_KW.test(text) && !EXPENSE_KW.test(text) ? 'income' : 'expense';
  const bank = bankDom ? BANK_SENDERS[bankDom] : undefined;
  const merchant = merchantFromSender(opts.from);
  const note = [merchant, bank].filter(Boolean).join(' · ') || opts.subject || 'จากอีเมล';

  return {
    type,
    amount,
    occurredAt: resolveDate(text, opts.receivedAt),
    note,
    bank,
    externalId: opts.messageId,
  };
}

/** Gmail query — อีเมลธนาคาร + ใบเสร็จ/คำสั่งซื้อ 90 วันล่าสุด ({} = OR ใน Gmail) */
export const BANK_EMAIL_QUERY =
  '{from:(' + Object.keys(BANK_SENDERS).join(' OR ') + ') ' +
  '"ใบเสร็จ" "ใบเสร็จรับเงิน" "ยืนยันการชำระ" "การสั่งซื้อ" "คำสั่งซื้อ" "ใบยืนยันการจอง" ' +
  '"ขอบคุณสำหรับการสั่งซื้อ" "ยอดชำระ" "order confirmation" receipt invoice "booking confirmation" "payment receipt"} ' +
  'newer_than:90d';
