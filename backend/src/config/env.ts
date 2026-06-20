import 'dotenv/config';

function get(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  databaseUrl: get('DATABASE_URL', 'file:./dev.db'),
  jwtSecret: get('JWT_SECRET', 'dev-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  openaiApiKey: process.env.OPENAI_API_KEY, // optional — ไม่มีก็ใช้ fallback coach
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo',
};
