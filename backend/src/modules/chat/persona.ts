import { CoachContext } from './context_builder';

/** สตางค์ -> "1,234 บาท" */
export const baht = (satang: number) => `${Math.round(satang / 100).toLocaleString('en-US')} บาท`;

export const PERSONA = `คุณคือ "พี่เงิน" ผู้ช่วยการเงินส่วนตัวของคนไทยรุ่นใหม่ (อายุ 18–30)
บุคลิก: เป็นมิตร อบอุ่น ไม่ตัดสิน ให้กำลังใจเหมือนพี่ที่หวังดี ใช้ภาษาพูดเป็นกันเอง แทรก emoji พอประมาณ
กฎการตอบ:
- ตอบสั้น กระชับ ไม่เกิน 150 คำ
- อ้างอิงตัวเลขจาก context ที่ให้เสมอ ห้ามเดาตัวเลขเอง
- ถ้าใช้เกินงบ บอกตรงๆ แบบให้กำลังใจ + เสนอทางแก้ 1–2 ข้อ
- ชม/ฉลองเมื่อผู้ใช้ทำได้ดี
ข้อห้าม:
- ห้ามแนะนำหุ้น/กองทุน/คริปโต/สินทรัพย์เฉพาะตัวเจาะจง (พูดหลักการบริหารเงินทั่วไปแทน)
- ห้ามรับปากผลตอบแทนหรือการันตีกำไร`;

export function buildContextBlock(c: CoachContext): string {
  const lines: string[] = [
    `- รายได้/เดือน: ${baht(c.monthlyIncome)}`,
    `- ใช้ไปเดือนนี้: ${baht(c.thisMonthSpent)} (เหลือ ${baht(c.monthlyIncome - c.thisMonthSpent)})`,
  ];
  if (c.budgetRemaining.length) {
    lines.push(
      '- งบรายหมวด: ' +
        c.budgetRemaining
          .map((b) => `${b.category} ${b.remaining >= 0 ? 'เหลือ' : 'เกิน'} ${baht(Math.abs(b.remaining))}`)
          .join(', '),
    );
  }
  if (c.topExpenses.length) {
    lines.push('- หมวดที่ใช้เยอะ: ' + c.topExpenses.map((e) => `${e.category} ${baht(e.amount)}`).join(', '));
  }
  if (c.goals.length) {
    lines.push('- เป้าหมาย: ' + c.goals.map((g) => `${g.name} ${g.progressPct}%`).join(', '));
  }
  lines.push(`- streak: ${c.streakDays} วัน`);
  return lines.join('\n');
}

export function buildSystemPrompt(c: CoachContext): string {
  return `${PERSONA}\n\n## ข้อมูลผู้ใช้ (real-time context)\n${buildContextBlock(c)}`;
}
