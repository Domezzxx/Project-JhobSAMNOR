import { google } from 'googleapis';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { parseBankEmail, BANK_EMAIL_QUERY } from './email_parser';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// ปล่อยให้ TS infer type (เลี่ยง OAuth2Client 2 เวอร์ชันชนกันระหว่าง google-auth-library กับ googleapis-common)
function oauthClient() {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new Error('ต้องตั้ง GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET ใน .env');
  }
  return new google.auth.OAuth2(
    env.googleClientId.split(',')[0].trim(),
    env.googleClientSecret,
    env.gmailRedirectUri,
  );
}

/** url ให้ผู้ใช้ไปกด consent (state = userId — prod ควรเซ็น/เข้ารหัส) */
export function getGmailAuthUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

/** แลก code เป็น refresh_token แล้วเก็บไว้กับ user */
export async function connectGmailFromCode(userId: string, code: string): Promise<void> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('ไม่ได้ refresh_token — เพิกถอนสิทธิ์ที่ myaccount.google.com แล้วเชื่อมใหม่');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { gmailRefreshToken: tokens.refresh_token, gmailConnectedAt: new Date() },
  });
}

/** ดูดเมลธนาคารล่าสุด → parse → ลงรายการ (กันซ้ำด้วย externalId = gmail message id) */
export async function syncGmailTransactions(userId: string): Promise<{ scanned: number; imported: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.gmailRefreshToken) throw new Error('ยังไม่ได้เชื่อม Gmail');

  const client = oauthClient();
  client.setCredentials({ refresh_token: user.gmailRefreshToken });
  const gmail = google.gmail({ version: 'v1', auth: client });

  const list = await gmail.users.messages.list({ userId: 'me', q: BANK_EMAIL_QUERY, maxResults: 50 });
  const msgs = list.data.messages ?? [];
  let imported = 0;

  for (const m of msgs) {
    if (!m.id) continue;
    const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
    const headers = full.data.payload?.headers ?? [];
    const subject = headers.find((h) => h.name === 'Subject')?.value ?? '';
    const from = headers.find((h) => h.name === 'From')?.value ?? '';
    const body = extractBody(full.data.payload) || full.data.snippet || '';
    const receivedAt = full.data.internalDate
      ? new Date(Number(full.data.internalDate))
      : undefined;

    const parsed = parseBankEmail({ subject, body, from, messageId: m.id, receivedAt });
    if (!parsed) continue;
    try {
      await prisma.transaction.create({
        data: {
          userId,
          type: parsed.type,
          amount: parsed.amount,
          note: parsed.note,
          source: 'email',
          externalId: parsed.externalId,
          occurredAt: parsed.occurredAt,
        },
      });
      imported++;
    } catch {
      // ซ้ำ (unique userId+externalId) → ข้าม
    }
  }
  return { scanned: msgs.length, imported };
}

/** ดึงข้อความ (text) จาก payload ของ Gmail message (recursive) */
function extractBody(payload: unknown): string {
  const p = payload as { body?: { data?: string }; parts?: unknown[] } | undefined;
  if (!p) return '';
  if (p.body?.data) return Buffer.from(p.body.data, 'base64').toString('utf-8');
  for (const part of p.parts ?? []) {
    const t = extractBody(part);
    if (t) return t;
  }
  return '';
}
