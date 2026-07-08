# Requirement Engineering

## 1. User Stories & Acceptance Criteria
*ครอบคลุม 4 กลุ่มผู้ใช้งานเป้าหมายจาก P01 รวมถึงผลวิเคราะห์จากแบบสอบถามผู้ใช้งานจริง*

**กลุ่มที่ 1: นักศึกษาที่เป็นผู้เริ่มวางแผนการเงิน**
- **User Story (REQ-001):** As a นักศึกษา, I want to สแกนสลิปโอนเงินผ่านมือถือ so that ระบบสามารถบันทึกรายจ่ายและจัดหมวดหมู่อัตโนมัติโดยที่ฉันไม่ต้องพิมพ์เอง
- **Acceptance Criteria:** 
  - ระบบสามารถดึงตัวเลขจำนวนเงิน วันที่ และชื่อร้านค้าจากรูปภาพสลิปได้ถูกต้อง
  - ผู้ใช้สามารถตรวจสอบและกดยืนยัน (Confirm) ก่อนที่ระบบจะบันทึกข้อมูล
  - ระบบจัดหมวดหมู่ (เช่น อาหาร, ช้อปปิ้ง) จากชื่อร้านที่ระบุไว้ได้อัตโนมัติ

**กลุ่มที่ 2: พนักงานที่มีเป้าหมายออม / ปลดหนี้**
- **User Story (REQ-002):** As a พนักงานประจำ, I want to กำหนดเป้าหมายการออมเงินรายเดือน so that ฉันสามารถติดตามความคืบหน้าและควบคุมไม่ให้ใช้จ่ายเกินงบได้
- **Acceptance Criteria:**
  - ผู้ใช้สามารถสร้างเป้าหมาย (ชื่อ, จำนวนเงิน, กำหนดเวลา) ได้
  - ระบบแสดงแถบความคืบหน้า (Progress Bar) เปรียบเทียบเงินที่ใช้ไปกับงบประมาณ
  - ระบบส่งแจ้งเตือน Push Notification เมื่อการใช้จ่ายเข้าใกล้ 80% และ 100% ของงบประมาณ

**กลุ่มที่ 3: ฟรีแลนซ์และผู้มีรายได้ไม่แน่นอน**
- **User Story (REQ-003):** As a ฟรีแลนซ์, I want to ดู Dashboard สรุปรายรับ-รายจ่ายที่สามารถปรับช่วงเวลาได้อิสระ so that ฉันสามารถวิเคราะห์กระแสเงินสดในแต่ละโปรเจกต์หรือแต่ละเดือนได้
- **Acceptance Criteria:**
  - Dashboard แสดงกราฟวงกลม (Pie Chart) แยกตามหมวดหมู่รายจ่าย
  - สามารถสลับมุมมองระหว่าง รายวัน / สัปดาห์ / เดือน / ช่วงเวลาที่กำหนดเองได้
  - กราฟต้องแสดงผลเร็ว (ใช้ Redis Cache ช่วย) และดูเข้าใจง่าย

**กลุ่มที่ 4: ผู้ที่ต้องการจัดการหนี้บัตรเครดิต / สินเชื่อ**
- **User Story (REQ-004):** As a ผู้มีหนี้บัตรเครดิต, I want to ปรึกษา AI Coach "พี่เงิน" เกี่ยวกับแผนการจ่ายหนี้ so that ฉันได้รับคำแนะนำที่เป็นรูปธรรมตามสภาพการเงินจริงของฉัน
- **Acceptance Criteria:**
  - สามารถพิมพ์แชทถาม AI Coach ด้วยภาษาไทยธรรมชาติได้ตลอด 24 ชั่วโมง
  - AI ต้องดึงข้อมูลจาก Transaction ของผู้ใช้ (Context Injection) มาประกอบการตอบ
  - AI ต้องไม่มีการให้คำแนะนำการลงทุนรายตัว (เช่น แนะนำให้ซื้อหุ้น) และต้องมีข้อความ Disclaimer เสมอ

## 2. Use Case Diagram
*ภาพแสดงความสัมพันธ์ระหว่างระบบและ Actor (User, AI Coach, Notification System)*

```mermaid
usecaseDiagram
    actor "ผู้ใช้งาน (User)" as U
    actor "AI Coach (Typhoon LLM)" as AI
    actor "ระบบแจ้งเตือน (FCM/Cron)" as Notif

    rectangle "แอปพลิเคชัน AI Finance Coach 'พี่เงิน'" {
        usecase "สมัครสมาชิก / เข้าสู่ระบบ" as UC1
        usecase "บันทึกรายรับ-รายจ่าย (สแกนสลิป)" as UC2
        usecase "ตั้งเป้าหมายและงบประมาณ" as UC3
        usecase "ดู Dashboard และรายงาน" as UC4
        usecase "แชทปรึกษาการเงิน" as UC5
        usecase "รับการแจ้งเตือนเตือนภัย" as UC6
        usecase "ทำนายรายจ่ายล่วงหน้า (Predict)" as UC7
    }

    U --> UC1
    U --> UC2
    U --> UC3
    U --> UC4
    U --> UC5

    UC5 <-- AI : ให้คำปรึกษา (อิง Context)
    UC7 <-- AI : วิเคราะห์ Anomaly (ผิดปกติ)

    UC6 <-- Notif : ส่ง Trigger เมื่อเกินงบ/ครบรอบ
```

## 3. Requirement Traceability Matrix (RTM)
*ตารางสอบย้อนกลับ: เชื่อมโยงเพื่อให้มั่นใจว่าความต้องการถูกพัฒนาและทดสอบครบถ้วน*

| Req ID | User Story | Design (Diagram / Screen) | Code File (Implementation) | Test Case ID |
|--------|-----------|---------------------------|----------------------------|--------------|
| **REQ-001** | บันทึกรายจ่ายอัตโนมัติจากสลิป (OCR) | Sequence Diagram (2) / Screen: `Scan Slip UI` | `lib/features/transactions/ocr_view.dart`, `backend/src/ocr.ts` | TC-01 |
| **REQ-002** | ตั้งเป้าหมายออมและดู Progress | ER Diagram / Screen: `Goal Dashboard` | `lib/features/goals/goal_provider.dart`, `backend/src/goals.ts` | TC-02 |
| **REQ-003** | Dashboard สรุปยอด ปรับช่วงเวลาได้ | Component Diagram / Screen: `Dashboard UI` | `lib/features/dashboard/pie_chart.dart`, `backend/src/aggregate.ts` | TC-03 |
| **REQ-004** | แชทปรึกษา AI Coach (Context Aware) | Sequence Diagram (1) / Screen: `Chat UI` | `lib/features/ai_coach/chat_view.dart`, `backend/src/langchain.ts` | TC-04 |
