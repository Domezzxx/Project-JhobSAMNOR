import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../../lib/http';
import { requireAuth } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/cache';
import { buildContext } from './context_builder';
import { generateReply, ChatTurn } from './coach';

export const chatRouter = Router();
chatRouter.use(requireAuth);

const sendSchema = z.object({ message: z.string().min(1).max(500) });

// GET /api/v1/chat -> ประวัติแชท
chatRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ messages });
  }),
);

// POST /api/v1/chat -> ส่งข้อความ + รับคำตอบจากพี่เงิน
chatRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { message } = sendSchema.parse(req.body);
    const userId = req.userId!;

    // rate limit ง่ายๆ: 20 ข้อความ/นาที/คน
    const rlKey = `chat_rl:${userId}`;
    const count = (await cache.get<number>(rlKey)) ?? 0;
    if (count >= 20) throw new HttpError(429, 'ส่งข้อความถี่เกินไป ลองใหม่อีกครั้งใน 1 นาที');
    await cache.set(rlKey, count + 1, 60);

    // เก็บข้อความผู้ใช้
    await prisma.chatMessage.create({ data: { userId, role: 'user', content: message } });

    // ประกอบ context จริง + ดึง history ล่าสุด
    const context = await buildContext(userId);
    const recent = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const history: ChatTurn[] = recent
      .reverse()
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    const { reply, source } = await generateReply(context, message, history);

    // เก็บคำตอบ (แนบ snapshot ว่า source อะไร)
    const saved = await prisma.chatMessage.create({
      data: { userId, role: 'assistant', content: reply, context: JSON.stringify({ source }) },
    });

    res.status(201).json({ message: saved, source });
  }),
);
