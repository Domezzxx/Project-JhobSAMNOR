# Feature / Function / Task Master List + WBS

## 6 ฟีเจอร์หลัก (อ้างอิงตาม P01)
1. บัญชี/โปรไฟล์ (Account/Profile)
2. บันทึกรายรับ-จ่ายด้วย OCR/SMS/Manual (Smart Transaction)
3. AI Coach "พี่เงิน"
4. Dashboard / รายงาน (Dashboard & Reports)
5. คาดการณ์ด้วย AI (AI Predictions)
6. เป้าหมาย และ Gamification (Goals & Gamification)

## Work Breakdown Structure (WBS)
```mermaid
wbs
  * AI Finance Coach "พี่เงิน"
    * F01 Account & Profile
      * F01.1 Auth (Login/Register)
      * F01.2 Profile Management
      * F01.3 PDPA & Security
    * F02 Smart Transaction
      * F02.1 Manual Input (3-tap)
      * F02.2 OCR (สแกนสลิป)
      * F02.3 SMS Reader (Best-effort)
      * F02.4 Auto-Categorization
    * F03 AI Coach
      * F03.1 Chat UI
      * F03.2 Context Builder
      * F03.3 LangChain Integration
    * F04 Dashboard & Reports
      * F04.1 Pie Chart & Spending
      * F04.2 Budget Progress
      * F04.3 Cash-flow Summary
    * F05 AI Predictions
      * F05.1 Prophet Model
      * F05.2 Anomaly Alert
    * F06 Goals & Gamification
      * F06.1 Goal Planning
      * F06.2 Streak & Badge System
      * F06.3 Smart Notifications
```

## Task Master List

| ID | Feature -> Component -> Function/Task | Owner | Status | Sprint |
|---|---|---|---|---|
| **F01** | **Account & Profile (บัญชี/โปรไฟล์)** | | | |
| C01.1 | Auth UI (หน้า Login/Register) | ต้า | todo | 1 |
| C01.2 | Auth API (JWT Authentication) | โดม | todo | 1 |
| C01.3 | PDPA (Consent, Export, ลบบัญชี) | โดม | todo | 7 |
| C01.4 | Biometric Lock (Face ID / Fingerprint) | ต้า | todo | 7 |
| **F02** | **Smart Transaction (บันทึกรายรับ-จ่าย)** | | | |
| C02.1 | Manual Add Transaction UI | ต้า | todo | 1 |
| C02.2 | Transaction CRUD API | โดม | todo | 1 |
| C02.3 | Camera & OCR UI (สแกนสลิป) | ต้า | todo | 2 |
| C02.4 | OCR Post-processing (ดึงตัวเลข/วันที่) | โดม | todo | 2 |
| C02.5 | Auto-categorize Rule Engine | โดม | todo | 2 |
| **F03** | **AI Coach "พี่เงิน"** | | | |
| C03.1 | Chat UI (Message List, Typing indicator) | ต้า | todo | 4 |
| C03.2 | Context Builder (ดึงข้อมูลให้ AI) | โดม | todo | 4 |
| C03.3 | LangChain Prompt & Integration | โดม | todo | 4 |
| **F04** | **Dashboard & Reports (รายงาน)** | | | |
| C04.1 | Dashboard UI (Pie Chart, งบประมาณ) | ต้า | todo | 3 |
| C04.2 | Budget Engine API & Cash-flow | โดม | todo | 3 |
| **F05** | **AI Predictions (คาดการณ์ AI)** | | | |
| C05.1 | Prediction UI (แสดงผลทำนาย) | ต้า | todo | 6 |
| C05.2 | Prophet Model Deployment | โดม | todo | 6 |
| **F06** | **Goals & Gamification (เป้าหมาย)** | | | |
| C06.1 | Goal Creation UI & Progress | ต้า | todo | 5 |
| C06.2 | Goals CRUD API | โดม | todo | 5 |
| C06.3 | FCM Smart Notifications (แจ้งเตือน) | โดม | todo | 5 |
| C06.4 | Gamification UI (Streak, Badge) | ต้า | todo | 6 |
| C06.5 | Achievements Engine API | โดม | todo | 6 |
