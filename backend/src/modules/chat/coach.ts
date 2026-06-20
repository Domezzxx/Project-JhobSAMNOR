import OpenAI from 'openai';
import { CoachContext } from './context_builder';
import { buildSystemPrompt, baht } from './persona';
import { env } from '../../config/env';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}
export interface CoachReply {
  reply: string;
  source: string; // ชื่อ model หรือ 'fallback'
}

/** เรียก LLM ถ้ามี OPENAI_API_KEY, ไม่งั้นใช้ fallback rule-based (ตอบจากข้อมูลจริง) */
export async function generateReply(
  context: CoachContext,
  question: string,
  history: ChatTurn[],
): Promise<CoachReply> {
  if (env.openaiApiKey) {
    try {
      const client = new OpenAI({ apiKey: env.openaiApiKey });
      const resp = await client.chat.completions.create({
        model: env.openaiModel,
        temperature: 0.6,
        max_tokens: 350,
        messages: [
          { role: 'system', content: buildSystemPrompt(context) },
          ...history.slice(-6),
          { role: 'user', content: question },
        ],
      });
      const reply = resp.choices[0]?.message?.content?.trim();
      if (reply) return { reply, source: env.openaiModel };
    } catch (e) {
      console.error('[coach] OpenAI error, ใช้ fallback:', (e as Error).message);
    }
  }
  return { reply: fallbackReply(context, question), source: 'fallback' };
}

/** โค้ชแบบ rule-based — ตอบ grounded จาก context จริง (ใช้ตอนยังไม่ใส่ API key) */
function fallbackReply(c: CoachContext, question: string): string {
  const remaining = c.monthlyIncome - c.thisMonthSpent;
  const over = c.budgetRemaining.filter((b) => b.remaining < 0);
  const top = c.topExpenses[0];

  if (/ออม|เก็บเงิน|save|saving/i.test(question)) {
    const save20 = Math.max(0, Math.round(remaining * 0.2));
    const goal = c.goals[0];
    return (
      `อยากออมใช่มั้ย เยี่ยมเลย! 👏 เดือนนี้เหลือ ${baht(remaining)} ` +
      `ลองกันไว้สัก 20% = ${baht(save20)} ก่อนใช้จ่ายอย่างอื่นนะ` +
      (goal
        ? ` เป้า "${goal.name}" ตอนนี้ ${goal.progressPct}% แล้ว สู้ๆ! 🎯`
        : ` แล้วลองตั้งเป้าหมายออมในแอปดู จะได้เห็นความคืบหน้า 💪`)
    );
  }

  if (/เกินงบ|งบประมาณ|งบเดือน|เหลืองบ|budget/i.test(question)) {
    if (over.length) {
      return (
        `ตอนนี้ ${over.map((o) => `${o.category} เกินงบ ${baht(-o.remaining)}`).join(', ')} 😅 ` +
        `ลองคุมหมวดนี้สักหน่อยในสัปดาห์นี้นะ เดี๋ยวก็กลับมาอยู่ในงบได้!`
      );
    }
    return `งบยังโอเคทุกหมวดเลย เก่งมาก! 🎉 เดือนนี้ใช้ไป ${baht(c.thisMonthSpent)} เหลืออีก ${baht(remaining)}`;
  }

  return (
    `เดือนนี้ใช้ไป ${baht(c.thisMonthSpent)} จาก ${baht(c.monthlyIncome)} เหลืออีก ${baht(remaining)} นะ 💰` +
    (top ? ` หมวดที่ใช้เยอะสุดคือ ${top.category} (${baht(top.amount)})` : '') +
    (over.length
      ? ` ⚠️ ระวัง ${over.map((o) => o.category).join(', ')} เกินงบแล้ว ลองคุมอีกนิดนะ!`
      : ` ยังอยู่ในงบ ทำได้ดีมาก! 🎉`)
  );
}
