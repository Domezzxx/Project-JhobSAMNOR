/** Parser ข้อความจาก e-Statement PDF (ธนาคารไทย) → รายการธุรกรรม
 *  ⚠️ generic — แต่ละธนาคารวางคอลัมน์ต่างกัน ต้องจูนตาม statement จริง (Krungthai/Dime ฯลฯ) */

export interface StatementRow {
  type: 'income' | 'expense';
  amount: number; // สตางค์
  occurredAt: Date;
  note: string;
}

const THAI_MONTHS: Record<string, number> = {
  'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
  'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12,
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const CREDIT_KW = /(เงินเข้า|รับโอน|โอนเข้า|ดอกเบี้ย|เงินปันผล|รับเงิน|deposit|credit|interest|received|refund)/i;

function toYear(y: number): number {
  if (y < 100) y += 2000;
  if (y > 2400) y -= 543; // พ.ศ. -> ค.ศ.
  return y;
}

function lineDate(line: string): Date | null {
  const m = line.match(/(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const dt = new Date(Date.UTC(toYear(parseInt(m[3], 10)), parseInt(m[2], 10) - 1, parseInt(m[1], 10)));
    if (!isNaN(dt.getTime())) return dt;
  }
  const months = Object.keys(THAI_MONTHS).map((k) => k.replace(/\./g, '\\.')).join('|');
  const tm = line.match(new RegExp(`(\\d{1,2})\\s*(${months})\\.?\\s*(\\d{2,4})`, 'i'));
  if (tm) {
    const mo = THAI_MONTHS[tm[2].toLowerCase()] ?? THAI_MONTHS[tm[2]];
    if (mo) {
      const dt = new Date(Date.UTC(toYear(parseInt(tm[3], 10)), mo - 1, parseInt(tm[1], 10)));
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  return null;
}

/** แยกข้อความ statement เป็นรายการ — บรรทัดที่มี (วันที่ + จำนวนเงินทศนิยม 2 ตำแหน่ง) */
export function parseStatementText(text: string): StatementRow[] {
  const rows: StatementRow[] = [];
  // ตัดเป็นช่วงที่ขึ้นต้นด้วยวันที่ (รองรับทั้งกรณีขึ้นบรรทัดใหม่และไหลต่อกัน)
  const chunks = text.split(/\n|(?=(?<!\d)\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/);
  for (const raw of chunks) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (line.length < 6) continue;
    const date = lineDate(line);
    if (!date) continue;
    const amts = [...line.matchAll(/(?<![\d.,])([0-9]{1,3}(?:,[0-9]{3})*\.\d{2})(?!\d)/g)].map((m) =>
      Math.round(parseFloat(m[1].replace(/,/g, '')) * 100),
    );
    if (!amts.length) continue;
    // statement มักเรียง [จำนวนธุรกรรม, ยอดคงเหลือ] — เอาตัวแรกเป็นยอดธุรกรรม
    const amount = amts[0];
    if (amount <= 0) continue;
    const type: 'income' | 'expense' = CREDIT_KW.test(line) ? 'income' : 'expense';
    const note =
      line
        .replace(/[0-9]{1,3}(?:,[0-9]{3})*\.\d{2}/g, '')
        .replace(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) || 'statement';
    rows.push({ type, amount, occurredAt: date, note });
  }
  return rows;
}
