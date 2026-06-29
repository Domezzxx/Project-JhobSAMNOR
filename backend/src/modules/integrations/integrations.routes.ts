import { Router } from 'express';
import { asyncHandler, HttpError } from '../../lib/http';
import { requireAuth } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { getGmailAuthUrl, connectGmailFromCode, syncGmailTransactions } from './gmail';
import { extractPdfText, PdfNeedsPasswordError, PdfWrongPasswordError } from './pdf';
import { parseStatementText } from './statement_parser';

export const integrationsRouter = Router();

// POST /api/v1/integrations/statement/import — อัปโหลด e-Statement PDF (+รหัส) → parse → ลงรายการ
integrationsRouter.post(
  '/statement/import',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { fileBase64, password } = req.body as { fileBase64?: string; password?: string };
    if (!fileBase64) throw new HttpError(400, 'ต้องส่ง fileBase64 (ไฟล์ PDF)');
    const buf = Buffer.from(fileBase64.replace(/^data:[^;]*;base64,/, ''), 'base64');

    let text: string;
    try {
      text = await extractPdfText(buf, password);
    } catch (e) {
      if (e instanceof PdfNeedsPasswordError || e instanceof PdfWrongPasswordError) {
        throw new HttpError(422, e.message);
      }
      throw new HttpError(400, 'อ่าน PDF ไม่ได้: ' + (e instanceof Error ? e.message : 'unknown'));
    }

    const rows = parseStatementText(text);
    let imported = 0;
    for (const r of rows) {
      const externalId = `stmt-${r.occurredAt.toISOString().slice(0, 10)}-${r.amount}-${r.note.slice(0, 16)}`;
      try {
        await prisma.transaction.create({
          data: {
            userId: req.userId!,
            type: r.type,
            amount: r.amount,
            note: r.note,
            source: 'statement',
            externalId,
            occurredAt: r.occurredAt,
          },
        });
        imported++;
      } catch {
        // ซ้ำ → ข้าม
      }
    }
    res.json({ rows: rows.length, imported });
  }),
);

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
