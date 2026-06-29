# 📧 Setup — ดูดรายการอัตโนมัติจากอีเมล (Email Parsing)

> สถานะ: **Backend เสร็จ + เทสแล้ว** · parser ผ่าน self-test · เหลือ (1) สร้าง Google OAuth + เปิด Gmail API · (2) ใส่ `.env` · (3) ปุ่มในแอป

## 🔁 หลักการ (flow)
```
แอป → GET /integrations/gmail/connect → ได้ Google consent URL → ผู้ใช้กดอนุญาต (gmail.readonly)
   → Google เด้งกลับ /gmail/callback?code → backend แลก refresh_token เก็บไว้
แอป → POST /integrations/gmail/sync → backend ดึงเมลธนาคาร 60 วัน → parse → ลงรายการ (กันซ้ำด้วย message id)
```

## ⚠️ 2 ข้อต้องรู้ก่อน
1. **`gmail.readonly` = "restricted scope"** → production ต้องผ่าน **Google security assessment (CASA)** (มีค่าใช้จ่าย/ใช้เวลา) — แต่ **dev ใช้ test users (≤100) ได้เลย ไม่ต้อง review** → พอสำหรับ senior project
2. **Parser ต้องจูนตามอีเมลจริง** — `email_parser.ts` มี pattern กลาง (จำนวนเงิน/วันที่/income-expense/ธนาคาร) แต่อีเมลแต่ละธนาคารฟอร์แมตต่างกัน → เก็บอีเมลจริงมาปรับ regex

---

## ส่วน A — Google Cloud (เปิด Gmail API + OAuth)
1. **Google Cloud Console** → Project เดิม (ที่ใช้ Google login) หรือสร้างใหม่
2. **APIs & Services → Library → เปิด "Gmail API"**
3. **OAuth consent screen** → External → เพิ่ม scope `.../auth/gmail.readonly` → เพิ่ม **Test users** (อีเมลทีม)
4. **Credentials → Create OAuth client ID → Web application**
   - **Authorized redirect URI:** `http://localhost:4000/api/v1/integrations/gmail/callback` (dev)
   - ได้ **Client ID + Client Secret**
5. ใส่ใน `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xxxx"
   GMAIL_REDIRECT_URI="http://localhost:4000/api/v1/integrations/gmail/callback"
   ```
6. restart backend → endpoint จะทำงานทันที

---

## ส่วน B — Endpoints (พร้อมใช้)
| Method | Path | ทำอะไร |
|---|---|---|
| GET | `/api/v1/integrations/gmail/connect` | คืน `{url}` ให้เปิดหน้า consent |
| GET | `/api/v1/integrations/gmail/callback` | Google เด้งกลับ → เก็บ refresh_token |
| POST | `/api/v1/integrations/gmail/sync` | ดูดเมล → ลงรายการ → `{scanned, imported}` |
| GET | `/api/v1/integrations/gmail/status` | `{connected, connectedAt}` |

## ส่วน C — Mobile (Flutter)
1. `flutter pub add url_launcher`
2. ปุ่ม "เชื่อม Gmail" ในหน้าโปรไฟล์:
   ```dart
   final res = await dio.get('/integrations/gmail/connect');
   await launchUrl(Uri.parse(res.data['url']), mode: LaunchMode.externalApplication);
   // ผู้ใช้กด consent ในเบราว์เซอร์ → กลับมากดปุ่ม "ดูดรายการ"
   final sync = await dio.post('/integrations/gmail/sync');
   // sync.data = { scanned, imported }
   ```

---

## 🔧 วิธีจูน parser (`backend/src/modules/integrations/email_parser.ts`)
- **เพิ่มธนาคาร:** เติมโดเมนผู้ส่งใน `BANK_SENDERS`
- **จำนวนเงิน/วันที่/ประเภท:** ปรับ regex `parseAmount` / `parseDate` / `INCOME_KW` / `EXPENSE_KW`
- **ทดสอบเร็ว:** เขียนไฟล์ชั่วคราว import `parseBankEmail({subject, body, from})` แล้ว `npx tsx` (เหมือน self-test ที่ผ่านแล้ว: SCB→expense, KBank→income, promo→null)

## 🔒 PDPA / ความปลอดภัย
- `gmail.readonly` = อ่านอย่างเดียว (แก้/ลบเมลไม่ได้) — ขอ scope น้อยสุด
- refresh_token เก็บใน DB → **prod ควรเข้ารหัส** (ตอนนี้ plaintext สำหรับ dev)
- ขอ consent ชัดเจนว่าจะอ่านเฉพาะเมลธนาคาร · parse ในbackend เราเอง · ส่งให้ LLM เฉพาะตัวเลข/หมวด (ตัด PII)
- `state` ใน OAuth ตอนนี้ = userId (dev) → **prod ควรเซ็น JWT กัน CSRF**
