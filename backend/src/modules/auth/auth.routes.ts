import { Router } from 'express';
import { asyncHandler, HttpError } from '../../lib/http';
import { requireAuth } from '../../lib/auth';
import { registerSchema, loginSchema } from '../../lib/validate';
import { registerUser, loginUser, socialLogin } from './auth.service';
import { verifyGoogleIdToken, verifyFacebookToken } from './social';
import { prisma } from '../../lib/prisma';

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    res.status(201).json(await registerUser(data));
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    res.json(await loginUser(data));
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        displayName: true,
        monthlyIncome: true,
        level: true,
        streak: true,
        avatarUrl: true,
        provider: true,
      },
    });
    res.json({ user });
  }),
);

// POST /api/v1/auth/google — รับ Google ID token จากแอป → verify → ออก JWT ของเรา
authRouter.post(
  '/google',
  asyncHandler(async (req, res) => {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) throw new HttpError(400, 'ต้องส่ง idToken');
    try {
      const profile = await verifyGoogleIdToken(idToken);
      res.json(await socialLogin({ provider: 'google', ...profile }));
    } catch (e) {
      throw new HttpError(401, `เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ${(e as Error).message}`);
    }
  }),
);

// POST /api/v1/auth/facebook — รับ Facebook access token → verify → ออก JWT ของเรา
authRouter.post(
  '/facebook',
  asyncHandler(async (req, res) => {
    const { accessToken } = req.body as { accessToken?: string };
    if (!accessToken) throw new HttpError(400, 'ต้องส่ง accessToken');
    try {
      const profile = await verifyFacebookToken(accessToken);
      res.json(await socialLogin({ provider: 'facebook', ...profile }));
    } catch (e) {
      throw new HttpError(401, `เข้าสู่ระบบด้วย Facebook ไม่สำเร็จ: ${(e as Error).message}`);
    }
  }),
);
