import { Router } from 'express';
import { asyncHandler, HttpError } from '../../lib/http';
import { requireAuth } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { getGmailAuthUrl, connectGmailFromCode, syncGmailTransactions } from './gmail';

export const integrationsRouter = Router();

// GET /api/v1/integrations/gmail/connect — คืน url ให้เปิดหน้า consent ของ Google
integrationsRouter.get(
  '/gmail/connect',
  requireAuth,
  asyncHandler(async (req, res) => {
    // ใช้ userId เป็น state (prod ควรเซ็น JWT/เข้ารหัสกัน CSRF)
    try {
      res.json({ url: getGmailAuthUrl(req.userId!) });
    } catch (e) {
      throw new HttpError(503, e instanceof Error ? e.message : 'ตั้งค่า Gmail OAuth ไม่ครบ');
    }
  }),
);

// GET /api/v1/integrations/gmail/callback — Google เด้ง browser กลับมาที่นี่ (ไม่ผ่าน requireAuth)
integrationsRouter.get(
  '/gmail/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state) throw new HttpError(400, 'missing code/state');
    await connectGmailFromCode(state, code); // state = userId
    res.send(
      '<html><body style="font-family:sans-serif;text-align:center;padding:48px">' +
        '<h2>✅ เชื่อม Gmail สำเร็จ</h2><p>กลับไปที่แอป แล้วกด "ดูดรายการจากอีเมล" ได้เลย</p></body></html>',
    );
  }),
);

// POST /api/v1/integrations/gmail/sync — ดูดเมลธนาคาร → ลงรายการ
integrationsRouter.post(
  '/gmail/sync',
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      res.json(await syncGmailTransactions(req.userId!));
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : 'ดูดรายการล้มเหลว');
    }
  }),
);

// GET /api/v1/integrations/gmail/status — เชื่อมแล้วหรือยัง
integrationsRouter.get(
  '/gmail/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const u = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { gmailConnectedAt: true },
    });
    res.json({ connected: !!u?.gmailConnectedAt, connectedAt: u?.gmailConnectedAt ?? null });
  }),
);
