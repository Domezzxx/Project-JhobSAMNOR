import { prisma } from '../../lib/prisma';

const THAI_MONTHS: Record<string, number> = {
  "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6,
  "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
};

export function parseAmount(text: string): number | null {
  const m = text.match(/จำนวน(?:เงิน)?\s*(?::|：)?\s*([\d,]+\.\d{2})/);
  if (m) {
    return Math.round(parseFloat(m[1].replace(/,/g, "")) * 100);
  }
  const amts: number[] = [];
  const matches = text.matchAll(/([\d,]+\.\d{2})\s*บาท/g);
  for (const match of matches) {
    amts.push(Math.round(parseFloat(match[1].replace(/,/g, "")) * 100));
  }
  return amts.length > 0 ? Math.max(...amts) : null;
}

export function parseDate(text: string): Date | null {
  const monthsPattern = Object.keys(THAI_MONTHS).map(k => k.replace(/\./g, "\\.")).join("|");
  const m1 = text.match(new RegExp(`(\\d{1,2})\\s*(${monthsPattern})\\s*(\\d{2,4})`));
  if (m1) {
    const day = parseInt(m1[1]);
    const month = THAI_MONTHS[m1[2]];
    let year = parseInt(m1[3]);
    if (year < 100) year += 2500;
    if (year > 2400) year -= 543;
    try {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } catch {
      return null;
    }
  }
  const m2 = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m2) {
    const day = parseInt(m2[1]);
    const month = parseInt(m2[2]);
    let year = parseInt(m2[3]);
    if (year < 100) year += 2500;
    if (year > 2400) year -= 543;
    try {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } catch {
      return null;
    }
  }
  return null;
}

export function parseRef(text: string): string | null {
  const m = text.match(/(?:รหัสอ้างอิง|อ้างอิง|Ref\.?|เลขที่อ้างอิง|เลขที่รายการ|Transaction\s*(?:No\.?|ID)?)\s*(?::|：)?\s*([0-9A-Za-z]+)/i);
  if (m && m[1].length >= 6) {
    return m[1];
  }
  const tokens = text.match(/\b([0-9A-Za-z]{12,30})\b/g);
  if (tokens && tokens.length > 0) {
    return tokens[0];
  }
  return null;
}

export function parseMerchant(text: string): string | null {
  const m = text.match(/(?:ไปยัง|โอนไปยัง|เข้าบัญชี|โอนเข้าบัญชี|ร้านค้า|บริษัท)\s*(?::|：)?\s*(.+)/);
  if (m) {
    const val = m[1].trim();
    const splitTokens = val.split(/\s+(?:xxx-|[0-9]{3}-|จำนวน|บาท|โอนเงิน|ธนาคาร|เข้าบัญชี|ไปยัง)/);
    return splitTokens[0].trim();
  }
  return null;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Food": ["ร้านอาหาร", "ส้มตำ", "ชาบู", "กะเพรา", "กาแฟ", "cafe", "coffee", "7-Eleven", "เซเว่น", "food", "ก๋วยเตี๋ยว", "ชาไข่มุก", "sushi", "หมูกระทะ", "อร่อย"],
  "Shopping": ["Shopee", "Lazada", "TikTok Shop", "เสื้อผ้า", "ห้าง", "Mall", "fashion", "gadget", "Uniqlo", "Zara", "H&M"],
  "Transport": ["BTS", "MRT", "วินมอเตอร์ไซค์", "แท็กซี่", "taxi", "Grab", "Bolt", "น้ำมัน", "ปตท", "shell", "caltex", "ทางด่วน", "ตั๋วเครื่องบิน"],
  "Bills": ["การไฟฟ้า", "การประปา", "อินเทอร์เน็ต", "AIS", "True", "DTAC", "Netflix", "Spotify", "บัตรเครดิต"],
  "Entertainment": ["โรงหนัง", "Major", "SF Cinema", "คาราโอเกะ", "เหล้า", "เบียร์", "ผับ", "บาร์", "concert", "เกม", "Steam", "PlayStation"],
  "Health": ["โรงพยาบาล", "คลินิก", "ยา", "pharmacy", "Watson", "Boots", "ฟิตเนส", "gym"],
  "Salary": ["เงินเดือน", "salary", "paycheck"],
};

export async function autoCategorize(
  text: string, 
  merchant: string, 
  type: 'income' | 'expense',
  userId?: string
): Promise<string | null> {
  // User Correction Learning: check past transactions for this user with same merchant
  if (userId && merchant) {
    const cleanMerchant = merchant.trim();
    if (cleanMerchant) {
      const lastTxn = await prisma.transaction.findFirst({
        where: {
          userId,
          type,
          note: {
            contains: cleanMerchant,
          },
          categoryId: { not: null },
        },
        orderBy: { occurredAt: 'desc' },
        select: { categoryId: true },
      });
      if (lastTxn && lastTxn.categoryId) {
        return lastTxn.categoryId;
      }
    }
  }

  const cleanText = text.replace(/อยุธยา/g, "").replace(/ธนาคาร/g, "");
  const queryText = `${cleanText} ${merchant}`.toLowerCase();
  
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (queryText.includes(kw.toLowerCase())) {
        const cat = await prisma.category.findFirst({ where: { name: catName, type } });
        if (cat) return cat.id;
      }
    }
  }
  
  const fallbackName = type === 'income' ? 'OtherIncome' : 'Food';
  const defaultCat = await prisma.category.findFirst({ where: { name: fallbackName, type } });
  return defaultCat ? defaultCat.id : null;
}
