# 🔐 Setup — Login ด้วย Google & Facebook

> สถานะ: **Backend เสร็จ + เทสแล้ว** (`POST /api/v1/auth/google`, `/auth/facebook`) · ปุ่มในหน้า login มีแล้ว (ยังเป็น placeholder)
> เหลือ: (1) สร้าง OAuth app บน Google/Facebook → ได้ client id · (2) ใส่ client id ใน backend `.env` · (3) ต่อ package ฝั่ง mobile

## 🔁 หลักการ (flow)
```
แอป (Flutter)  ──login Google/FB──►  ได้ idToken/accessToken
      │  POST {idToken|accessToken}
      ▼
Backend /auth/google|/facebook  ──verify token กับ Google/FB──►  หา/สร้าง user  ──►  ออก JWT ของเรา
      │  { user, token }
      ▼
แอปเก็บ JWT (เหมือน login ปกติ) แล้วใช้งานต่อ
```
> ✅ ปลอดภัย: แอปไม่เก็บรหัสผ่าน, backend เป็นคนตรวจ token จริงกับ Google/FB ก่อนออก JWT

---

## ส่วน A — Google (ง่ายกว่า แนะนำทำก่อน)
1. ไป **Google Cloud Console** → สร้าง Project ใหม่
2. **APIs & Services → OAuth consent screen** → เลือก *External* → กรอกชื่อแอป, email, scope `email`+`profile` → เพิ่ม test users (อีเมลทีม)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** สร้างตาม platform ที่จะใช้:
   - **Web** (สำหรับ build web + เป็น `serverClientId`)
   - **Android** (ใส่ package name + **SHA-1** จาก `keytool` / `gradlew signingReport`)
   - **iOS** (ใส่ Bundle ID)
4. ก็อป **Client ID** มาใส่ใน `backend/.env` (ใส่ได้หลายอัน คั่นด้วย `,`):
   ```env
   GOOGLE_CLIENT_ID="xxxx-web.apps.googleusercontent.com,yyyy-android.apps.googleusercontent.com"
   ```
   > backend ใช้ตรวจว่า token ออกให้ client id ของเราจริง (audience)

## ส่วน B — Facebook (ต้องเตรียมมากกว่า)
1. ไป **developers.facebook.com → My Apps → Create App** → เลือกชนิด *Consumer*
2. เพิ่ม product **Facebook Login**
3. **Settings → Basic** → ได้ **App ID** + **App Secret** → ใส่ใน `backend/.env`:
   ```env
   FACEBOOK_APP_ID="xxxxxxxxxxxx"
   FACEBOOK_APP_SECRET="xxxxxxxxxxxx"
   ```
4. ตั้ง platform: Android (Key Hash), iOS (Bundle ID), Website (URL)
5. ⚠️ **โปรดักชันต้องมี Privacy Policy URL + ผ่าน App Review** ถึงจะขอ `email` จากผู้ใช้ทั่วไปได้ — ตอน dev ใช้ **test users / role ในแอป** ทดสอบได้เลย

> หลังใส่ `.env` แล้ว restart backend — endpoint จะ verify token จริงทันที (ไม่ต้องแก้โค้ด backend อีก)

---

## ส่วน C — ต่อฝั่ง Mobile (Flutter)
### 1) เพิ่ม package
```bash
cd mobile
flutter pub add google_sign_in flutter_facebook_auth
```
> ⚠️ เช็ค API ตามเวอร์ชันที่ pub ดึงมา — `google_sign_in` v7 ใช้ `GoogleSignIn.instance.initialize()` + `authenticate()` (ต่างจาก v6 ที่ใช้ `.signIn()`)

### 2) Config ต่อ platform
- **Android:** ใส่ SHA-1 ใน Google console · สำหรับ FB เพิ่ม App ID/Client Token ใน `android/app/src/main/res/values/strings.xml` + meta-data ใน `AndroidManifest.xml`
- **iOS:** เพิ่ม URL scheme ของ Google (`REVERSED_CLIENT_ID`) และ FB ใน `Info.plist`
- **Web:** `web/index.html` เพิ่ม `<meta name="google-signin-client_id" content="<web-client-id>">` และ init FB SDK

### 3) เพิ่ม method ใน `lib/features/auth/auth_controller.dart`
```dart
// import 'package:google_sign_in/google_sign_in.dart';
// import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';

Future<bool> loginWithGoogle() async {
  state = state.copyWith(loading: true, clearError: true);
  try {
    final gsi = GoogleSignIn.instance;
    await gsi.initialize(serverClientId: '<WEB_CLIENT_ID>');
    final account = await gsi.authenticate();
    final idToken = account.authentication.idToken;
    final res = await _dio.post('/auth/google', data: {'idToken': idToken});
    await _tokens.write(res.data['token'] as String);
    state = AuthState(user: AppUser.fromJson(res.data['user'] as Map<String, dynamic>));
    return true;
  } catch (e) {
    state = state.copyWith(loading: false, error: 'Google: $e');
    return false;
  }
}

Future<bool> loginWithFacebook() async {
  state = state.copyWith(loading: true, clearError: true);
  try {
    final result = await FacebookAuth.instance.login(permissions: ['email', 'public_profile']);
    final token = result.accessToken?.tokenString;
    if (token == null) throw Exception('ยกเลิก/ไม่ได้ token');
    final res = await _dio.post('/auth/facebook', data: {'accessToken': token});
    await _tokens.write(res.data['token'] as String);
    state = AuthState(user: AppUser.fromJson(res.data['user'] as Map<String, dynamic>));
    return true;
  } catch (e) {
    state = state.copyWith(loading: false, error: 'Facebook: $e');
    return false;
  }
}
```

### 4) แก้ปุ่มใน `login_screen.dart`
เปลี่ยน `_socialLogin(provider)` (ที่ตอนนี้เด้ง SnackBar) ให้เรียกของจริง:
```dart
onTap: () async {
  final ok = await ref.read(authControllerProvider.notifier).loginWithGoogle(); // หรือ loginWithFacebook()
  if (ok && mounted) context.go('/');
},
```

---

## 📌 หมายเหตุสำคัญ
- **web vs mobile ตั้งค่าคนละชุด** — เราเทสบน web อยู่ แต่เป้าจริงคือ Android/iOS (ทำ client id แยกตาม platform)
- **AppUser** มี field `avatarUrl` + `provider` แล้ว (backend ส่งกลับมา) — เอาไปโชว์รูปโปรไฟล์จาก Google/FB ได้
- **การผูกบัญชี:** ถ้าอีเมลเดียวกับที่เคยสมัครแบบ local → ระบบ "link" ให้ (ล็อกอินได้ทั้ง 2 ทาง)
- **Facebook อาจไม่ส่ง email** ถ้าผู้ใช้ไม่อนุญาต → backend จะ error ชัดเจน ("ต้องขอ permission email")
