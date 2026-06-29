import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword, signToken } from '../../lib/auth';
import { HttpError } from '../../lib/http';

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  monthlyIncome: number;
  level: number;
  streak: number;
  avatarUrl?: string | null;
  provider?: string;
};

function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    monthlyIncome: u.monthlyIncome,
    level: u.level,
    streak: u.streak,
    avatarUrl: u.avatarUrl ?? null,
    provider: u.provider ?? 'local',
  };
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName?: string;
  monthlyIncome?: number;
}) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new HttpError(409, 'อีเมลนี้ถูกใช้แล้ว');

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName,
      monthlyIncome: input.monthlyIncome ?? 0,
      provider: 'local',
    },
  });
  return { user: publicUser(user), token: signToken(user.id) };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }
  return { user: publicUser(user), token: signToken(user.id) };
}

/** ล็อกอินด้วย social (Google/Facebook) — หา user จากอีเมล; ไม่มีก็สร้างใหม่ แล้วออก JWT */
export async function socialLogin(input: {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          providerId: existing.providerId ?? input.providerId,
          avatarUrl: existing.avatarUrl ?? input.avatarUrl,
          displayName: existing.displayName ?? input.displayName,
          // ถ้าเดิมสมัครแบบ local ไว้ ให้ "link" บัญชี (ยังล็อกอินด้วยรหัสผ่านได้) — ไม่ทับ provider
          provider: existing.provider === 'local' ? 'local' : input.provider,
        },
      })
    : await prisma.user.create({
        data: {
          email: input.email,
          provider: input.provider,
          providerId: input.providerId,
          avatarUrl: input.avatarUrl,
          displayName: input.displayName,
        },
      });
  return { user: publicUser(user), token: signToken(user.id) };
}
