# 📱 TASK — ต้า (Mobile Developer)

> โฟกัสรอบนี้: **ออกแบบ + implement layout หน้าแอป** (Flutter) ตาม spec ที่แตงกวา (System Analyst) เตรียมให้
> Stack: Flutter + Riverpod + go_router · theme กลางอยู่ที่ `lib/app/theme.dart` (มี `softCard()`, `kSoftShadow`, สี `AppColors`, chip/pill theme พร้อมใช้)

## 🎯 เป้าหมาย
ทำให้ทุกหน้าจอ **หน้าตาเหมือนกันทั้งแอป** (ใช้ design system เดียวกัน) และครบทุกสถานะ (ปกติ/ว่าง/โหลด/error)

---

## งานย่อย (เรียงตามลำดับแนะนำ)

### T1 · Design System — แยก component ใช้ซ้ำ  ⭐ทำก่อน
- สร้าง `lib/app/widgets/` รวม widget กลาง: `AppCard` (การ์ดขาว+เงานุ่มจาก `softCard()`), `SectionHeader` (ไอคอน+หัวข้อ+ปุ่ม "ดูทั้งหมด"), `AppChip`, `PrimaryButton`, `EmptyState`, `LoadingState`, `ErrorState`
- ไฟล์: `lib/app/widgets/*.dart`
- ✅ DoD: หน้าเดิม (dashboard/chat/budget/profile) refactor มาใช้ widget กลาง ไม่มีการ์ด/ปุ่ม hardcode ซ้ำ

### T2 · หน้า Onboarding / Welcome
- 3 สไลด์แนะนำฟีเจอร์ (สแกนสลิป · โค้ช AI · ตั้งงบ) + ปุ่ม "เริ่มใช้งาน" → ไป `/login`
- ไฟล์: `lib/features/onboarding/onboarding_screen.dart` + route `/onboarding`
- ✅ DoD: เลื่อนสไลด์ได้ (PageView) + dot indicator + ปุ่ม skip

### T3 · หน้า Goals (เป้าหมายออม)
- Layout: รายการเป้าหมาย (การ์ด + progress bar %) + ปุ่ม "+ ตั้งเป้าใหม่" + ฟอร์มสร้าง (ชื่อ/ยอดเป้า/เดดไลน์)
- ไฟล์: `lib/features/goals/goals_screen.dart` + route `/goals` (ปุ่ม "เป้าหมาย" ใน quick action ชี้มาที่นี่)
- ⚠️ ขึ้นกับ: API Goals (ยังไม่มี — ใช้ mock data ไปก่อน รอ backend) → คุยกับแตงกวาเรื่อง field
- ✅ DoD: layout ครบ + mock progress วิ่งได้

### T4 · หน้าจัดการงบประมาณ (เพิ่ม/แก้งบ)
- ตอนนี้ `/budgets` ดูได้อย่างเดียว → เพิ่มฟอร์ม เพิ่ม/แก้/ลบ งบรายหมวด
- ไฟล์: `lib/features/budgets/budget_edit_screen.dart`
- API พร้อมแล้ว: `POST/PATCH/DELETE /api/v1/budgets` (ดู README)
- ✅ DoD: เพิ่มงบ → กลับมาเห็นใน progress section จริง

### T5 · หน้าประวัติรายการ (Transaction History)
- รายการเต็ม + ฟิลเตอร์ (เดือน/หมวด/ประเภท) + ช่องค้นหา
- ไฟล์: `lib/features/transactions/history_screen.dart`
- API พร้อม: `GET /api/v1/transactions?month=&type=`
- ✅ DoD: ฟิลเตอร์ทำงาน + แตะรายการแก้ไขได้ (reuse ฟอร์มเดิม)

### T6 · Empty / Loading / Error states ทุกหน้า
- ใส่ skeleton loader ตอนโหลด + ภาพ/ข้อความเมื่อว่าง + ปุ่มลองใหม่เมื่อ error (ใช้ widget จาก T1)
- ✅ DoD: ปิดเน็ตแล้วแอปไม่ค้าง/ขาว มี state บอกผู้ใช้

---

## 📐 กติกาหน้าตา (ให้เหมือนทั้งแอป)
- การ์ด: มุมมน 16–20, เงานุ่ม (`softCard()`), เว้นระยะ 16
- สีหลัก `AppColors.primary` (ม่วง) · รายรับเขียว `income` · รายจ่ายแดง `expense`
- ตัวเลขเงิน: ใช้ `Money.formatBaht()` เสมอ (เก็บเป็นสตางค์)
- ปุ่ม/ช่องกรอก: ใช้ theme กลาง (มุมมนอยู่แล้ว) อย่า hardcode

## 🔄 การส่งงาน
- แตก branch ต่อ 1 งาน: `feature/ta-<ชื่องาน>` (เช่น `feature/ta-goals-screen`)
- ทำเสร็จ → เปิด PR → ให้แตงกวา/เบสรีวิว → merge เข้า `main`
- รัน `flutter analyze` ให้ผ่าน (0 error) ก่อนเปิด PR
- 📖 ขั้นตอน Git ละเอียด: ดู `docs/GIT_WORKFLOW_GUIDE.md`
