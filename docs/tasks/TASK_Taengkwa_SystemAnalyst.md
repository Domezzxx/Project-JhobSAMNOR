# 🧩 TASK — แตงกวา (System Analyst)

> โฟกัสรอบนี้: **วางสเปก/ดีไซน์ layout หน้าแอป** เพื่อให้ต้า (Mobile Dev) implement ได้ตรง ไม่ต้องเดา
> ส่งมอบเป็นเอกสารใน `docs/specs/` (markdown) — เป็น "พิมพ์เขียว" ของแต่ละหน้าจอ

## 🎯 เป้าหมาย
ทุกหน้าจอมี **สเปกชัดเจน**: มีอะไรบนจอ, ดึงข้อมูลจาก API ไหน, สถานะไหนบ้าง, เงื่อนไข validation, และ "เสร็จ" หมายความว่าอะไร

---

## งานย่อย

### S1 · Screen Inventory + Navigation Map  ⭐ทำก่อน
- ลิสต์หน้าจอทั้งหมด (มีแล้ว: Dashboard, Chat, Add/Edit Transaction, Budget, Profile · จะเพิ่ม: Onboarding, Goals, Budget Edit, History)
- วาดแผนผังการนำทาง (หน้าไหนไปหน้าไหน, bottom nav, deep link)
- ส่ง: `docs/specs/00_navigation_map.md` (ใช้ Mermaid flowchart ก็ได้)

### S2 · Screen Spec รายหน้า (พิมพ์เขียว)
ทำหน้าละ 1 ไฟล์ `docs/specs/<หน้า>.md` ครอบคลุม:
- **องค์ประกอบบนจอ** (header, การ์ดอะไรบ้าง, ปุ่ม, ลำดับ)
- **ข้อมูลที่แสดง** (field ไหน มาจากไหน)
- **การกระทำของผู้ใช้** (กดแล้วเกิดอะไร / ไปหน้าไหน)
- ทำให้ครบหน้าที่ต้าจะสร้าง: **Onboarding, Goals, Budget Edit, Transaction History**

### S3 · UI ↔ API Mapping (สำคัญ — กันงานติด)
- แต่ละหน้า/แต่ละการ์ด ใช้ endpoint + field อะไร (อ้างอิง API contract ใน `README.md`)
- **ระบุช่องว่าง**: เช่น หน้า Goals ยัง **ไม่มี API** (`/goals`) → ต้องแจ้งให้ทำ backend ก่อน + ร่าง field ที่ต้องการ (name, target, current, deadline)
- ส่ง: `docs/specs/api_mapping.md` (ตาราง หน้า → endpoint → field → สถานะ พร้อม/ขาด)

### S4 · States + Validation + Edge cases
- ทุกหน้า/ฟอร์ม กำหนด: สถานะ **ว่าง / กำลังโหลด / error**, กฎ validation (เช่น ยอดเงิน > 0, ชื่อเป้าห้ามว่าง), ข้อความ error ภาษาไทย
- ส่ง: รวมในไฟล์ spec ของแต่ละหน้า (S2)

### S5 · Acceptance Criteria รายหน้า
- เขียนเป็นข้อ ✅ ที่ทดสอบได้ (เช่น "กดเพิ่มงบ → เห็นในรายการทันที", "ปิดเน็ต → แสดงข้อความ ไม่ค้าง")
- ใช้เป็นเช็คลิสต์ตอนรีวิว PR ของต้า

### S6 · Non-functional (เผื่อ Sprint 7)
- จุดที่เกี่ยว **PDPA**: หน้า consent ตอนสมัคร, ปุ่มลบบัญชี/export ข้อมูลในหน้า Profile
- ตรวจคำไทยให้เป็นมิตร/สม่ำเสมอทั้งแอป + accessibility (ขนาดฟอนต์, contrast)

---

## 🤝 ทำงานคู่กับต้า
- spec ของแตงกวา = input ของต้า → คุยกันก่อนเริ่มแต่ละหน้า
- ลำดับแนะนำ: **S1 → S3 (หา API ที่ขาด) → S2 ทีละหน้า** เพื่อให้ต้าเริ่ม implement ได้เร็ว
- เวลามี API ขาด (เช่น Goals) แจ้งเบส/ทีม backend ทันที จะได้ทำขนานกัน

## 🔄 การส่งงาน
- แตก branch: `feature/taengkwa-<งาน>` (เช่น `feature/taengkwa-nav-map`)
- เอกสารอยู่ใน `docs/specs/` → เปิด PR → merge เข้า `main`
- 📖 ขั้นตอน Git ละเอียด: ดู `docs/GIT_WORKFLOW_GUIDE.md`
