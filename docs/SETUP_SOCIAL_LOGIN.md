# 🔐 Setup — Social Login (Google/Facebook) + Gmail Subscription Import

> โค้ดพร้อมแล้วทั้ง backend + mobile · เอกสารนี้คือขั้นตอนตั้งค่า **credentials ของคุณ** เพื่อให้ล็อกอิน/นำเข้าจริงได้
> ⚠️ ผมสร้าง Google/Facebook app แทนไม่ได้ — ต้องเป็นบัญชีคุณ

## 🗺️ ภาพรวมที่โค้ดทำไว้แล้ว
- **Backend:** `POST /auth/google {idToken}` · `POST /auth/facebook {accessToken}` → verify → find-or-create user → คืน JWT ของเรา · `POST /subscriptions/import-gmail {accessToken}` → สแกน Gmail สร้าง subscription
- **Mobile:** ปุ่ม Google/Facebook ในหน้า Login+Register · ปุ่ม 📧 "นำเข้าจาก Gmail" ในหน้า Subscription
- **DB:** `User` เพิ่ม `provider`, `providerId`, `avatarUrl` และ `passwordHash` เป็น optional

---

## 1️⃣ Google Cloud (Login + Gmail)
1. ไป https://console.cloud.google.com → สร้าง **Project** ใหม่
2. **APIs & Services → OAuth consent screen**
   - User type: **External** · กรอกชื่อแอป/อีเมล
   - **Scopes:** เพิ่ม `.../auth/userinfo.email`, `.../auth/userinfo.profile`, และ **`.../auth/gmail.readonly`** ⚠️ (อันหลังเป็น *restricted scope*)
   - **Test users:** เพิ่มอีเมลที่จะใช้ทดสอบ (ตอน dev ใช้โหมด *Testing* ได้เลย ไม่ต้องผ่าน verification)
3. **APIs & Services → Library** → เปิด **Gmail API**
4. **Credentials → Create OAuth client ID** (สร้างตาม platform ที่จะรัน):
   - **Web application** → ใส่ Authorized JavaScript origins (เช่น `http://localhost:PORT`) → ได้ **Web Client ID**
   - **Android** → ใส่ package name + **SHA-1** (`keytool -list -v -keystore ...`) → ได้ Android Client ID
   - **iOS** → ใส่ Bundle ID → ได้ iOS Client ID

> ⚠️ **restricted scope (gmail.readonly):** production จริงต้องส่งแอปให้ Google **security review** (เอกสาร + วิดีโอ) แต่ **โหมด Testing + test users ใช้ได้ทันทีสำหรับ dev/เดโม senior project**

## 2️⃣ Facebook (Login)
1. https://developers.facebook.com → **Create App** (type: Consumer)
2. เพิ่ม product **Facebook Login**
3. **App settings → Basic:** เอา **App ID** + **App Secret**
4. เพิ่ม OAuth redirect / platform (Android package+key hash, iOS bundle, Web domain)
5. permission `email`, `public_profile` (public_profile ใช้ได้เลย; email อาจต้อง app review ตอน production)

## 3️⃣ ตั้งค่า Backend (`backend/.env`)
```env
# Google — ใส่ Client ID ได้หลายตัว คั่นด้วย , (web,android,ios) เพื่อ verify audience
GOOGLE_CLIENT_ID=xxxx-web.apps.googleusercontent.com,xxxx-android.apps.googleusercontent.com
# Facebook
FACEBOOK_APP_ID=1234567890
FACEBOOK_APP_SECRET=xxxxxxxx
```
> restart backend หลังแก้ `.env` เสมอ (`Ctrl+C` แล้ว `npm run dev`)

## 4️⃣ ตั้งค่า Mobile (แต่ละ platform)
**google_sign_in:**
- **Web:** ใส่ใน `mobile/web/index.html` ใน `<head>`:
  ```html
  <meta name="google-signin-client_id" content="YOUR_WEB_CLIENT_ID.apps.googleusercontent.com">
  ```
- **Android:** วาง `google-services.json` ใน `mobile/android/app/` + ใส่ SHA-1 ใน Google Cloud
- **iOS:** ใส่ reversed client ID เป็น URL scheme ใน `ios/Runner/Info.plist`

**flutter_facebook_auth:**
- **Android:** ใส่ `facebook_app_id`, `facebook_client_token` ใน `android/app/src/main/res/values/strings.xml` + meta-data ใน `AndroidManifest.xml`
- **iOS:** ใส่ `FacebookAppID`, `CFBundleURLSchemes (fb<APPID>)` ใน `Info.plist`
- **Web:** init FB SDK (ดู doc ของ flutter_facebook_auth `webAndDesktopInitialization`)

## 5️⃣ ทดสอบ
1. ใส่ credentials ครบ → restart backend + `flutter run`
2. หน้า Login → กด **"เข้าสู่ระบบด้วย Google"** → เลือกบัญชี (test user) → เข้าแอปได้ (backend verify idToken → JWT)
3. หน้า Subscription → กด 📧 → ยินยอม scope Gmail → ระบบสแกนอีเมลใบเสร็จ → สร้างรายการ

---

## ⚠️ ข้อจำกัด/หมายเหตุที่ต้องรู้
- **Gmail import เป็น best-effort:** อ่าน "ผู้ส่ง" จับบริการยอดฮิต (Netflix/Spotify/YouTube/Disney+/iCloud/Prime) แล้วใส่ **ราคาเริ่มต้น** (อ่านยอดจากเนื้อเมลแม่นยำยาก) — ผู้ใช้แก้ยอด/รอบบิลทีหลังได้ · ปรับรายชื่อบริการ/ราคาได้ที่ `backend/src/modules/subscriptions/gmail_import.ts` (`KNOWN[]`)
- **ความปลอดภัย:** ไม่เก็บอีเมล/เนื้อหาเมลลง DB (อ่าน metadata ชั่วคราวเท่านั้น) · access token ไม่ถูกเก็บ (ใช้แล้วทิ้ง) — ตรงกับหลัก PDPA
- **บัญชีเดิม:** ถ้าอีเมล Google/FB ตรงกับบัญชี email/password เดิม → ระบบ **ผูกบัญชี** ให้อัตโนมัติ (ไม่สร้างซ้ำ)
- iOS ต้อง build ผ่าน Codemagic (Windows build ไม่ได้)

## 📁 ไฟล์ที่เกี่ยวข้อง
- Backend: `modules/auth/oauth.service.ts` · `modules/auth/auth.routes.ts` · `modules/subscriptions/gmail_import.ts`
- Mobile: `features/auth/auth_controller.dart` (loginWithGoogle/Facebook) · `features/auth/social_login_buttons.dart` · `features/subscriptions/subscriptions_screen.dart` (`_importGmail`)
