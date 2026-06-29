import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';

const googleClient = new OAuth2Client();

export interface SocialProfile {
  providerId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

/** ตรวจ Google ID token (จาก google_sign_in ในแอป) แล้วคืนโปรไฟล์ */
export async function verifyGoogleIdToken(idToken: string): Promise<SocialProfile> {
  if (!env.googleClientId) throw new Error('ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID ใน .env');
  const audience = env.googleClientId.split(',').map((s) => s.trim()); // รองรับหลาย client id (web/android/ios)
  const ticket = await googleClient.verifyIdToken({ idToken, audience });
  const p = ticket.getPayload();
  if (!p?.email) throw new Error('Google token ไม่มีอีเมล');
  return { providerId: p.sub, email: p.email, displayName: p.name, avatarUrl: p.picture };
}

/** ตรวจ Facebook access token ผ่าน Graph API แล้วคืนโปรไฟล์ */
export async function verifyFacebookToken(accessToken: string): Promise<SocialProfile> {
  const url =
    'https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=' +
    encodeURIComponent(accessToken);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Facebook token ไม่ถูกต้องหรือหมดอายุ');
  const d = (await res.json()) as {
    id: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
  };
  if (!d.email) throw new Error('Facebook ไม่ได้ให้อีเมล — แอปต้องขอ permission "email"');
  return { providerId: d.id, email: d.email, displayName: d.name, avatarUrl: d.picture?.data?.url };
}
